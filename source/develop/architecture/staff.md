# Архитектура — Staff

### Современные технологии и тренды в области разработки архитектуры сложных масштабируемых систем: serverless, edge computing, или stream processing

Serverless (FaaS — Functions as a Service) переносит эксплуатацию инфраструктуры на облачного провайдера: разработчик пишет отдельные функции, которые масштабируются автоматически и оплачиваются по факту вызовов — упрощает операционную нагрузку, но добавляет cold start задержки и усложняет локальную отладку распределённой системы. Edge computing выполняет часть логики максимально близко к пользователю (на CDN-узлах), что резко снижает задержку для персонализации, A/B-тестов и middleware-логики без похода на центральный сервер — на фронтенде это выражается в Edge Functions/Middleware (Next.js Edge Runtime, Cloudflare Workers), выполняющих, например, редиректы или геолокационную персонализацию до рендера страницы. Stream processing обрабатывает данные непрерывным потоком по мере поступления событий (а не пакетами), что критично для систем реального времени (live-дашборды, коллаборативные приложения, финансовые тикеры) — на фронтенде выражается в потреблении данных через WebSocket/SSE вместо периодического поллинга.

```ts
// Edge Middleware (Next.js): персонализация до рендера, выполняется на edge-узле рядом с пользователем
export function middleware(request: Request) {
  const country = request.headers.get('x-vercel-ip-country');
  const url = new URL(request.url);
  if (country === 'RU' && !url.pathname.startsWith('/ru')) {
    return Response.redirect(new URL(`/ru${url.pathname}`, request.url));
  }
}

// Stream processing на клиенте: обработка потока событий через SSE
const stream = new EventSource('/api/live-updates');
stream.onmessage = (event) => {
  const update = JSON.parse(event.data);
  applyLiveUpdate(update); // обработка каждого события по мере поступления, без поллинга
};
```

### Методы тонкой настройки производительности и пропускной способности

Тонкая настройка производительности на уровне архитектуры фронтенда включает: приоритизацию критического рендер-пути (critical CSS inline, остальное — асинхронно), стратегии предзагрузки (`preload`/`prefetch`/`preconnect` под конкретные сценарии навигации), выбор гранулярности код-сплиттинга (не слишком крупные чанки — долгая загрузка, не слишком мелкие — overhead на количество запросов), настройку кэш-заголовков и immutable-ассетов с хэшами в имени, а также тонкую настройку React concurrent-режима (приоритизация обновлений через `useTransition`/`useDeferredValue`) для сохранения отзывчивости UI при тяжёлых обновлениях состояния.

```tsx
// приоритизация: срочный ввод не блокируется тяжёлым пересчётом списка
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Item[]>([]);

  function handleChange(value: string) {
    setQuery(value); // высокий приоритет — мгновенный отклик поля ввода
    startTransition(() => {
      setResults(computeExpensiveSearch(value)); // низкий приоритет — может быть прерван
    });
  }

  return (
    <>
      <input value={query} onChange={(e) => handleChange(e.target.value)} />
      {isPending ? <Spinner /> : <ResultsList items={results} />}
    </>
  );
}
```

### Инструменты и технологии построения высоконагруженных систем

Для высоконагруженного фронтенда ключевые инструменты и техники: CDN с edge-кэшированием для статики и части динамического контента, HTTP/2-HTTP/3 для мультиплексирования соединений, service worker для offline-first стратегий и кэширования на клиенте (Workbox), виртуализация больших списков (`react-window`, `@tanstack/virtual`), Web Workers для выноса тяжёлых вычислений из главного потока, а также инфраструктура наблюдаемости (Prometheus/Grafana/Jaeger — см. middle.md/senior.md) для раннего обнаружения деградации под нагрузкой.

```ts
// вынос тяжёлого вычисления в Web Worker, чтобы не блокировать главный поток и UI
// worker.ts
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url));
worker.postMessage(largeDataset);
worker.onmessage = (e) => renderResult(e.data);
```

### Принципы проектирования систем логирования для высоконагруженных и масштабируемых приложений

В высоконагруженных системах логирование само по себе может стать узким местом, поэтому применяются: асинхронная буферизованная отправка логов (батчинг вместо запроса на каждое событие), sampling логов (не каждое событие логируется, а статистическая выборка — как с трейсами в Sentry), структурированный JSON-формат для эффективного индексирования, ротация и retention policy для контроля объёма хранения, а также разделение "горячего" пути (сама операция) и "холодного" пути логирования (доставка в хранилище), чтобы запись лога не замедляла основную операцию.

```ts
// батчинг клиентских логов вместо отправки запроса на каждое событие
class LogBatcher {
  private buffer: object[] = [];
  private flushIntervalMs = 5000;

  constructor() {
    setInterval(() => this.flush(), this.flushIntervalMs);
    window.addEventListener('beforeunload', () => this.flush(true));
  }

  log(entry: object): void {
    this.buffer.push({ ...entry, timestamp: Date.now() });
    if (this.buffer.length >= 50) this.flush(); // защита от переполнения буфера
  }

  private flush(useBeacon = false): void {
    if (this.buffer.length === 0) return;
    const payload = JSON.stringify(this.buffer);
    this.buffer = [];
    if (useBeacon) navigator.sendBeacon('/api/logs', payload);
    else fetch('/api/logs', { method: 'POST', body: payload, keepalive: true });
  }
}
```

### Понятия SLA / SLO / SLI

SLI (Service Level Indicator) — конкретная измеримая метрика качества сервиса (например, доля успешных ответов за 5 минут, p95 задержки главной страницы). SLO (Service Level Objective) — внутренняя цель по значению SLI, к которой стремится команда (например, "p95 LCP < 2.5s для 95% сессий за 30 дней"). SLA (Service Level Agreement) — формальное соглашение с внешними обязательствами и последствиями за нарушение (обычно с клиентами/бизнесом), как правило менее строгое, чем внутренний SLO, чтобы оставался запас на внутренние инциденты до нарушения внешних обязательств. Для фронтенда SLI часто строятся вокруг Core Web Vitals и доступности критичных пользовательских сценариев (успешное оформление заказа), а не только серверных метрик.

```ts
// вычисление SLI: доля сессий с LCP лучше целевого порога за период
function calculateLcpSli(sessions: { lcp: number }[], targetMs = 2500): number {
  const good = sessions.filter((s) => s.lcp <= targetMs).length;
  return good / sessions.length; // например, 0.97 → сравнить с SLO 0.95
}
```

## Практика (УМЕЕТ)

### Проводить аудит и оценивать архитектуру существующих систем, выявляя слабые места и проводя необходимую модернизацию

Аудит начинается со сбора объективных данных (RUM-метрики, распределение бандла, дерево зависимостей), а не с субъективных впечатлений — используем анализатор бандла и Core Web Vitals из senior.md, чтобы найти конкретные узкие места перед модернизацией:

```bash
npx webpack-bundle-analyzer stats.json
```

```ts
// сопоставление регрессии производительности с конкретным релизом при аудите
const bySli = calculateLcpSli(sessionsForRelease('v2.14.0'));
if (bySli < 0.95) {
  flagForModernization('v2.14.0', { reason: 'LCP SLO нарушен', sli: bySli });
}
```

### Проектировать системы с учетом SLA/SLO

Проектируем fallback-стратегию, гарантирующую соблюдение SLO по доступности главной страницы, даже если один из бэкенд-сервисов недоступен — сочетание circuit breaker (senior.md) и SLO-порога:

```ts
async function loadHomepage() {
  const [catalog, recommendations] = await Promise.allSettled([
    breaker.call(() => apiGet('/catalog'), () => cachedCatalog()),
    breaker.call(() => apiGet('/recommendations'), () => []), // некритичный блок — просто скрываем
  ]);
  return {
    catalog: catalog.status === 'fulfilled' ? catalog.value : cachedCatalog(),
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  };
}
```

### Создавать масштабируемые и отказоустойчивые решения с эффективным использованием логирования и метрик

Комбинация `LogBatcher` и SLI-метрик выше в едином решении — при превышении порога ошибок автоматически повышается уровень детализации логирования для диагностики, не создавая постоянной нагрузки в штатном режиме:

```ts
let debugLoggingEnabled = false;

function reportError(error: Error, context: object) {
  logBatcher.log({ level: 'error', message: error.message, ...context });
  errorRateWindow.record();
  if (errorRateWindow.rate() > 0.05 && !debugLoggingEnabled) {
    debugLoggingEnabled = true; // временно включаем подробное логирование при всплеске ошибок
    setTimeout(() => (debugLoggingEnabled = false), 5 * 60 * 1000);
  }
}
```

### Определять и реализовывать эффективные стратегии хранения и анализа данных

На клиенте — стратегия многоуровневого кэша (память → IndexedDB → сеть) для offline-first приложений, снижающая нагрузку на сеть и обеспечивающая отказоустойчивость:

```ts
async function getProduct(id: string): Promise<Product> {
  const inMemory = memoryCache.get(id);
  if (inMemory) return inMemory;

  const cached = await idbGet('products', id);
  if (cached && Date.now() - cached.fetchedAt < 60_000) return cached.data;

  const fresh = await apiGet<Product>(`/products/${id}`);
  await idbSet('products', id, { data: fresh, fetchedAt: Date.now() });
  memoryCache.set(id, fresh);
  return fresh;
}
```

### Создание и интеграция пользовательских метрик и алертинг на основе логов

Кастомная бизнес-метрика (не техническая, а продуктовая — например, "доля неуспешных оформлений заказа") интегрируется в тот же конвейер, что и технические метрики, с алертом при превышении порога:

```ts
function trackCheckoutOutcome(outcome: 'success' | 'failure', reason?: string) {
  logBatcher.log({ level: outcome === 'failure' ? 'warn' : 'info', event: 'checkout_outcome', outcome, reason });
  sendToMonitoring({ name: 'checkout_failure_rate', value: outcome === 'failure' ? 1 : 0 });
  // в Grafana настроен алерт: checkout_failure_rate > 10% за 15 минут → уведомление в Slack
}
```

### Проектировать системы контроля выполнения нефункциональных требований (метрики)

Итоговая система контроля SLO объединяет SLI-вычисление, алертинг и дашборд в единый цикл: метрики собираются непрерывно (RUM), агрегируются в Grafana, сравниваются с целевым SLO, а при устойчивом нарушении автоматически создаётся тикет/алерт без ручного мониторинга:

```ts
setInterval(async () => {
  const sli = calculateLcpSli(await fetchRecentSessions());
  sendToMonitoring({ name: 'lcp_sli', value: sli });
  if (sli < 0.95) {
    await createAlert({ title: 'LCP SLO нарушен', sli, threshold: 0.95 });
  }
}, 15 * 60 * 1000);
```
