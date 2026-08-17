# Архитектура — Senior

### Продвинутые подходы проектирования (DDD, Clean Architecture)

Domain-Driven Design (DDD) — подход, при котором структура кода моделирует предметную область бизнеса напрямую: используются агрегаты, сущности (entities с идентичностью), value objects (неизменяемые объекты без идентичности), репозитории (абстракция доступа к данным агрегата) и единый язык (ubiquitous language), общий для разработчиков и бизнеса. Clean Architecture (аналогично Hexagonal/Onion Architecture) организует код концентрическими слоями, где зависимости направлены только внутрь — к домену: доменный слой (бизнес-правила) не знает о фреймворках, UI или базе данных, а внешние слои (UI, инфраструктура) зависят от домена через интерфейсы, а не наоборот. На фронтенде это выражается в том, что бизнес-логика (например, валидация заказа, расчёт скидки) выносится в чистые модули, не завязанные на React/Vue, а UI-слой лишь вызывает их.

```
src/
  domain/              — не зависит ни от чего снаружи
    Order.ts            — сущность с инвариантами
    Money.ts             — value object (неизменяемый)
    OrderRepository.ts   — интерфейс (порт)
  application/          — use-case'ы, оркестрируют домен
    PlaceOrderUseCase.ts
  infrastructure/       — реализации портов
    RestOrderRepository.ts
  ui/                    — React/Vue-компоненты, вызывают use-case'ы
    OrderPage.tsx
```

```ts
// domain/Money.ts — value object: неизменяем, сравнение по значению, а не по ссылке
class Money {
  private constructor(private readonly cents: number, private readonly currency: string) {}
  static of(amount: number, currency: string): Money {
    return new Money(Math.round(amount * 100), currency);
  }
  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('Валюты не совпадают');
    return new Money(this.cents + other.cents, this.currency);
  }
  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }
}
```

Комбинируем Clean Architecture (домен выше) с CQRS, разделяя команды и запросы в одном модуле заказов, чтобы каждая сторона могла развиваться и оптимизироваться независимо:

```ts
// application/queries/GetOrderQuery.ts — чтение, может использовать денормализованный источник
class GetOrderQuery {
  constructor(private repo: OrderRepository) {}
  execute(orderId: string) { return this.repo.findById(orderId); }
}

// application/commands/PlaceOrderCommand.ts — запись, проходит через доменные инварианты
class PlaceOrderCommand {
  constructor(private repo: OrderRepository) {}
  async execute(order: Order) {
    order.validate(); // доменная бизнес-логика
    await this.repo.save(order);
    publishOrderPlaced(order); // Pub-Sub уведомление после успешной записи
  }
}
```

### Особенности основных архитектурных паттернов (MVC, MVVM, MVP, CQRS, Saga, Pub-Sub, Event Sourcing, Microkernel), разницу между ними, плюсы и минусы

MVP (Model-View-Presenter) похож на MVC, но View полностью пассивна — весь UI-логика в Presenter, который явно вызывает методы View через интерфейс, что упрощает unit-тестирование презентационной логики без реального рендера. CQRS (Command Query Responsibility Segregation) разделяет модели чтения и записи — команды (изменяющие состояние) и запросы (читающие данные) обрабатываются разными путями, что позволяет независимо оптимизировать/масштабировать каждый; минус — усложнение и возможная временная рассинхронизация read/write моделей. Saga — паттерн координации распределённых транзакций через последовательность локальных транзакций с компенсирующими действиями при сбое (актуален для бэкенда, но фронтенд должен понимать его, чтобы правильно обрабатывать промежуточные/неполные состояния заказа в UI). Pub-Sub — компоненты взаимодействуют через шину событий, не зная друг о друге напрямую (publisher публикует событие, subscriber на него реагирует), что снижает связанность, но усложняет отслеживание потока данных. Event Sourcing — состояние системы хранится не как текущий снимок, а как последовательность событий, из которых оно восстанавливается воспроизведением — даёт полную историю изменений (полезно для undo/redo в сложных UI-редакторах), но усложняет чтение текущего состояния и требует снапшотов для производительности. Microkernel (plug-in architecture) — минимальное стабильное ядро плюс независимо подключаемые плагины/модули, типично для расширяемых приложений (IDE, редакторы) — плюс гибкость расширения, минус — сложность версионирования контрактов плагинов.

```ts
// Pub-Sub на клиенте через EventTarget — компоненты не знают друг о друге напрямую
const eventBus = new EventTarget();

function publishOrderPlaced(order: Order) {
  eventBus.dispatchEvent(new CustomEvent('order:placed', { detail: order }));
}
eventBus.addEventListener('order:placed', (e) => {
  const order = (e as CustomEvent<Order>).detail;
  showNotification(`Заказ ${order.id} оформлен`);
});

// Event Sourcing на клиенте для undo/redo в редакторе
type EditorEvent = { type: 'insert'; text: string } | { type: 'delete'; length: number };
class EditorHistory {
  private events: EditorEvent[] = [];
  apply(event: EditorEvent): void { this.events.push(event); }
  getStateAt(index: number): string {
    return this.events.slice(0, index).reduce((text, e) =>
      e.type === 'insert' ? text + e.text : text.slice(0, -e.length), '');
  }
}
```

### Паттерны отказоустойчивости (rate limiting, circuit breaker, timeout, retry, fallback, bulkhead)

Rate limiting ограничивает частоту запросов к ресурсу, защищая от перегрузки. Circuit breaker отслеживает частоту ошибок при обращении к нестабильному сервису и, превысив порог, временно "размыкает цепь" — сразу отклоняет запросы без реального вызова, давая сервису восстановиться, а после паузы пробует снова (half-open состояние). Timeout ограничивает время ожидания ответа, чтобы зависший запрос не блокировал приложение бесконечно. Retry повторяет неудавшийся запрос (обычно с экспоненциальной задержкой), полезен для временных сбоев сети. Fallback предоставляет запасной результат (кэш, дефолтные данные, упрощённый UI), когда основной путь недоступен. Bulkhead изолирует ресурсы разных операций друг от друга (например, отдельные пулы соединений для критичных и некритичных запросов), чтобы сбой в одной части не исчерпал ресурсы для остальных.

```ts
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime = 0;
  constructor(private threshold = 5, private cooldownMs = 30000) {}

  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'half-open'; // пробуем один запрос после паузы
      } else {
        return fallback();
      }
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (err) {
      this.failures += 1;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) this.state = 'open';
      return fallback();
    }
  }
}

const breaker = new CircuitBreaker();
const recommendations = await breaker.call(
  () => fetch('/api/recommendations').then((r) => r.json()),
  () => [], // fallback: пустой список вместо падения UI
);
```

### Способы поддержания согласованности данных при одновременном доступе (concurrency)

При одновременном доступе к данным (несколько вкладок, коллаборативное редактирование, гонки запросов) применяют: optimistic locking (версия/timestamp записи проверяется при сохранении, конфликт обнаруживается постфактум), pessimistic locking (ресурс блокируется на время операции, менее применим на фронтенде из-за stateless HTTP), последний-побеждает (last-write-wins, простое, но теряет данные при конфликте), операционные трансформации (OT) или CRDT (Conflict-free Replicated Data Types) для настоящего совместного редактирования без потери изменений (Google Docs, Figma). На уровне отдельного клиента также важно избегать состояния гонки (race condition) между параллельными асинхронными запросами — например, устаревший ответ на предыдущий запрос не должен перезаписать более новый результат.

```ts
// защита от race condition между параллельными запросами (устаревший ответ игнорируется)
let latestRequestId = 0;
async function search(query: string) {
  const requestId = ++latestRequestId;
  const results = await fetch(`/api/search?q=${query}`).then((r) => r.json());
  if (requestId !== latestRequestId) return; // пришёл устаревший ответ — игнорируем
  renderResults(results);
}

// optimistic locking при сохранении документа
async function saveDocument(doc: { id: string; version: number; content: string }) {
  const res = await fetch(`/api/docs/${doc.id}`, {
    method: 'PUT',
    headers: { 'If-Match': String(doc.version) },
    body: JSON.stringify(doc),
  });
  if (res.status === 409) throw new Error('Документ изменён другим пользователем — требуется merge');
}
```

Опираясь на race-condition-safe `search` выше — дополняем debounce, чтобы не отправлять лишние запросы при быстром вводе, снижая нагрузку и на клиент, и на сервер:

```ts
const debouncedSearch = throttle(search, 300); // throttle определён в middle.md
input.addEventListener('input', (e) => debouncedSearch((e.target as HTMLInputElement).value));
```

### Принципы взаимодействия с системами мониторинга для создания наглядных дашбордов метрик и логов

Дашборды строятся вокруг метрик, которые действительно отражают здоровье и производительность системы с точки зрения пользователя, а не только технических деталей: RED-метрики (Rate, Errors, Duration) для запросов и Core Web Vitals (LCP, INP, CLS) для фронтенда. Метрики должны быть протегированы значимыми измерениями (route, releaseVersion, userSegment), чтобы можно было фильтровать и находить корреляции (например, деградация LCP только на определённом релизе). Дашборд эффективен, когда на нём видна не только текущая цифра, но и тренд во времени и связь с алертами — иначе он превращается в "мёртвый" экран, на который никто не смотрит при инциденте.

```ts
// отправка кастомной метрики Core Web Vitals с тегами для последующей фильтрации в Grafana
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToMonitoring(metric: { name: string; value: number }) {
  navigator.sendBeacon('/api/metrics', JSON.stringify({
    ...metric,
    route: location.pathname,
    release: __APP_VERSION__,
  }));
}

onLCP(sendToMonitoring);
onINP(sendToMonitoring);
onCLS(sendToMonitoring);
```

Опираясь на пример с Core Web Vitals и тегами выше — собираем детальную картину узкого места, сопоставляя метрику деградации с конкретным релизом и маршрутом через дашборд Grafana:

```ts
onLCP((metric) => {
  if (metric.value > 2500) {
    sendToMonitoring({ name: 'lcp_degraded', value: metric.value });
    // в Grafana дашборде фильтруем по route+release, чтобы найти, где именно деградация началась
  }
});
```

Оптимизация настройки Sentry — снижение `tracesSampleRate` для высоконагруженных маршрутов и точечное увеличение для критичных (checkout), чтобы не терять важные трейсы, но и не перегружать инфраструктуру объёмом данных:

```ts
Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  tracesSampler: (samplingContext) => {
    if (samplingContext.name?.includes('checkout')) return 1.0; // критичный путь — 100%
    return 0.05; // остальное — 5%, чтобы не перегружать Sentry
  },
});
```

### Требования к регистрации логов для соблюдения стандартов безопасности и конфиденциальности

Логи не должны содержать чувствительные данные в открытом виде: пароли, токены доступа, номера карт, персональные данные (ФИО, email, телефон) должны маскироваться или полностью исключаться перед записью, в соответствии с требованиями GDPR/152-ФЗ и подобных регуляций. Необходимо контролировать срок хранения логов (retention policy) и доступ к ним (только авторизованный персонал), а также обеспечивать неизменяемость (immutability) критичных security-логов (аудит доступа) для последующего расследования инцидентов. На фронтенде особенно важно не логировать содержимое форм оплаты/паролей даже в debug-режиме, так как такие логи легко случайно попадают в консоль браузера пользователя или в сторонний сервис мониторинга.

```ts
// маскирование чувствительных полей перед отправкой в систему логирования
const SENSITIVE_KEYS = new Set(['password', 'cardNumber', 'cvv', 'token', 'email']);

function sanitizeForLogging(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) =>
      SENSITIVE_KEYS.has(key) ? [key, '***'] : [key, value]
    )
  );
}

logEvent('info', 'Форма отправлена', sanitizeForLogging(formData));
```

Используя структурированные логи из middle.md и `sanitizeForLogging` выше — строим запрос в ElasticSearch/Kibana для выявления частых ошибок оплаты за последний час, сгруппированных по причине отказа:

```
# пример Kibana/ELK запроса (KQL)
level: "error" and message: "Оплата не прошла" and @timestamp >= now-1h
| stats count() by reason
```

### Документировать архитектуру ПО

Практическая документация архитектуры — ADR (Architecture Decision Record), фиксирующий конкретное решение, альтернативы и последствия, чтобы решение можно было пересмотреть осознанно, а не забыть его причину:

```md
# ADR-012: Переход на CQRS для модуля заказов

## Статус
Принято

## Контекст
Чтение списка заказов стало медленным при росте числа полей в форме записи заказа.

## Решение
Разделить модели чтения (денормализованная витрина) и записи (доменная модель с валидацией).

## Последствия
+ Независимая оптимизация чтения и записи.
- Дополнительная сложность синхронизации read-модели.
```
