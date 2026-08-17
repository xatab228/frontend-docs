# Архитектура — Middle

### Особенности построения систем разного типа (Монолит, SOA, Микросервисы)

Монолит — вся функциональность в едином деплоймент-юните; прост в разработке и отладке на старте, но с ростом команды и кодовой базы усложняется сборка, тестирование и деплой, а изменения в одной части рискуют затронуть другие. SOA (Service-Oriented Architecture) — система разбита на крупные сервисы, взаимодействующие обычно через шину сообщений или общий протокол (часто SOAP/XML), с акцентом на переиспользование сервисов между разными приложениями организации — но со временем такая шина часто становится узким местом и единой точкой отказа. Микросервисы — более мелкая гранулярность сервисов, каждый владеет своими данными и деплоится независимо, обычно взаимодействуют через лёгкие протоколы (REST/gRPC/events) без центральной шины — дают независимость команд и отказоустойчивость, но требуют зрелой инфраструктуры (service discovery, распределённый трейсинг, оркестрация) и усложняют консистентность данных между сервисами.

```
Монолит:            [ UI + Business Logic + Data Access ] → одна БД

SOA:      [Service A] ─┐
           [Service B] ─┼── Enterprise Service Bus ── [Service C]
           [Service D] ─┘

Микросервисы: [Order Service] --REST/gRPC--> [Payment Service]
                     │                              │
                 [Order DB]                    [Payment DB]   — у каждого сервиса своя БД
```

С точки зрения frontend-разработчика "поддержка" микросервисной архитектуры означает проектирование клиента так, чтобы он не был жёстко привязан к топологии бэкенда — используем единый API Gateway/BFF (Backend for Frontend) как точку входа, скрывающую от клиента, что за ней несколько сервисов:

```ts
// клиент обращается к единому BFF-эндпоинту, не зная о внутренних микросервисах
async function loadOrderPage(orderId: string) {
  const [order, payment, shipping] = await Promise.all([
    apiGet(`/bff/orders/${orderId}`),
    apiGet(`/bff/orders/${orderId}/payment`),
    apiGet(`/bff/orders/${orderId}/shipping`),
  ]);
  return { order, payment, shipping };
}
```

### Ключевые нефункциональные требования и показатели качества системы (доступность, отказоустойчивость, безопасность, масштабируемость, задержка, пропускная способность и пр.)

Нефункциональные требования описывают не "что делает" система, а "как хорошо" она это делает. Доступность (availability) — доля времени, когда система работоспособна, часто измеряется в "девятках" (99.9%). Отказоустойчивость (resilience/fault tolerance) — способность продолжать работу (пусть и в ограниченном режиме) при сбое отдельных компонентов. Безопасность — защита данных и функциональности от несанкционированного доступа. Масштабируемость — способность выдерживать растущую нагрузку за счёт добавления ресурсов. Задержка (latency) — время отклика на отдельный запрос. Пропускная способность (throughput) — количество запросов, обрабатываемых системой за единицу времени. На фронтенде эти требования проявляются, например, как Core Web Vitals (LCP, INP, CLS — прокси для "задержки" и воспринимаемой производительности).

```ts
// пример измерения "задержки" на клиенте через Performance API
const start = performance.now();
await fetch('/api/products');
const latency = performance.now() - start;
if (latency > 1000) {
  reportMetric('slow_api_call', { endpoint: '/api/products', latency });
}
```

### Применять на практике хотя бы один паттерн presentation layer

Применяем MVVM из junior.md на практике в реальном Vue-компоненте, где ViewModel инкапсулирует презентационную логику отдельно от Model (данных с сервера):

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';

// ViewModel: презентационное состояние + производные данные
const products = ref([]);
const search = ref('');
const filteredProducts = computed(() =>
  products.value.filter((p) => p.name.toLowerCase().includes(search.value.toLowerCase()))
);

onMounted(async () => {
  products.value = await (await fetch('/api/products')).json(); // Model
});
</script>

<template>
  <input v-model="search" placeholder="Поиск..." />
  <ul>
    <li v-for="p in filteredProducts" :key="p.id">{{ p.name }}</li>
  </ul>
</template>
```

### Основные признаки высоконагруженных (highload) систем (большое количество пользователей, частые операции записи/чтения данных и пр.)

Highload-системы характеризуются большим количеством одновременных пользователей, высокой частотой операций чтения/записи, значительными объёмами данных и трафика, а также строгими требованиями к времени отклика при таких нагрузках. Для frontend это означает необходимость дополнительных мер: агрессивное кэширование ответов API, debounce/throttle пользовательского ввода перед отправкой запросов, виртуализация длинных списков вместо рендера тысяч DOM-узлов, батчинг запросов вместо множества мелких вызовов, CDN для статики.

```ts
// throttle частых событий (скролл, resize) — типичная мера для highload-фронтенда
function throttle<T extends (...args: any[]) => void>(fn: T, delayMs: number): T {
  let lastCall = 0;
  return ((...args) => {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

window.addEventListener('scroll', throttle(updateVisibleItems, 100));
```

### Принципы мониторинга и трейсинга приложений

Мониторинг — непрерывный сбор метрик о состоянии и поведении приложения (частота ошибок, время отклика, использование ресурсов) для оценки здоровья системы в реальном времени и построения алертов. Трейсинг — отслеживание пути отдельного запроса через все компоненты системы (frontend → API Gateway → сервисы), что позволяет увидеть, на каком именно шаге возникла задержка или ошибка, особенно важно в распределённых системах, где один пользовательский запрос затрагивает несколько сервисов. На фронтенде трейс обычно начинается с генерации trace ID при инициации запроса и передаётся дальше через заголовки (`traceparent` из стандарта W3C Trace Context).

```ts
// генерация и проброс trace ID для сквозного трейсинга (упрощённо, в духе OpenTelemetry)
function fetchWithTracing(url: string, options: RequestInit = {}) {
  const traceId = crypto.randomUUID();
  return fetch(url, {
    ...options,
    headers: { ...options.headers, 'X-Trace-Id': traceId },
  });
}
```

### Наиболее актуальные технологии наблюдаемости (например, Grafana, Prometheus, Jaeger)

Наблюдаемость (observability) строится на трёх столпах: метриках, логах и трейсах. Prometheus — система сбора и хранения временных рядов метрик (например, количество ошибок в минуту), работает по модели pull, периодически опрашивая эндпоинты `/metrics`. Grafana — инструмент визуализации метрик из разных источников (Prometheus, Elasticsearch и др.) в виде дашбордов и алертов. Jaeger — система распределённого трейсинга (реализация OpenTracing/OpenTelemetry), визуализирующая путь запроса через микросервисы и время, потраченное на каждом шаге. Для фронтенда чаще используют RUM-инструменты (Real User Monitoring) — например, Sentry Performance или Grafana Faro — собирающие метрики реальных пользовательских сессий (LCP, ошибки JS, длительность запросов) прямо из браузера.

```ts
// пример инициализации Sentry для сбора ошибок и производительности на фронте
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2, // трейсим 20% транзакций, чтобы не перегружать инфраструктуру
});
```

Практическое применение Sentry — отслеживание пользовательской транзакции с кастомным спаном для замера конкретного участка кода:

```ts
import * as Sentry from '@sentry/react';

async function checkout(cart: Cart) {
  return Sentry.startSpan({ name: 'checkout-flow', op: 'ui.action' }, async () => {
    await submitOrder(cart);
  });
}
```

### Эффективные инструменты логирования и анализа (например, ElasticSearch, Splunk, Sentry и др.)

Такие инструменты собирают логи из множества источников в единое централизованное хранилище, где их можно искать, фильтровать и агрегировать. ElasticSearch (часто в связке ELK/EFK — ElasticSearch, Logstash/Fluentd, Kibana) — полнотекстовый поисковый движок, широко используемый для хранения и анализа структурированных логов с построением дашбордов в Kibana. Splunk — коммерческая платформа со схожими возможностями и мощной аналитикой/алертингом, часто применяется в enterprise. Sentry специализируется именно на ошибках и производительности приложений — группирует однотипные ошибки, показывает стектрейс с привязкой к исходному коду через source maps, отслеживает частоту повторения проблемы и связывает её с релизами.

```ts
// структурированное логирование (JSON), удобное для парсинга ElasticSearch/Splunk
function logEvent(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...meta }));
}

logEvent('error', 'Оплата не прошла', { orderId: 42, userId: 'u-1', reason: 'card_declined' });
```

Развивая `logEvent` выше — интегрируем его с Sentry, чтобы ошибки уровня `error` автоматически создавали событие для алертинга, а не просто писались в консоль:

```ts
function logEvent(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...meta }));
  if (level === 'error') {
    Sentry.captureMessage(message, { level: 'error', extra: meta }); // триггерит алерт в Sentry
  }
}
```
