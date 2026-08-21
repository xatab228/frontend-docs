# Инструменты — Senior

## Правила публикации пакетов и поддержки совместимости с разными окружениями

Публичный пакет должен корректно резолвиться и в CJS-, и в ESM-окружениях, и в Node, и в браузерных бандлерах — для этого используют поле `exports` с условными путями (`import`/`require`/`types`) вместо одного `main`, плюс отдельные сборки (`dist/index.js`, `dist/index.mjs`) через двойную сборку (dual package). Версионирование должно строго следовать semver, чтобы consumer'ы могли безопасно обновляться в рамках диапазона `^`/`~`, а breaking changes выносить только в major. `files`/`.npmignore` ограничивают публикуемый набор файлов, а `publishConfig.access` явно задаёт видимость scoped-пакета.

```json
{
  "name": "@myorg/my-lib",
  "version": "1.2.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  }
}
```
```bash
npm login
npm publish --access public       # для scoped-пакетов (@org/name) по умолчанию private
npm publish --tag beta            # публикация под дистрибутивным тегом (не latest)
npm dist-tag add my-lib@1.2.0 latest
```
```bash
npx changeset               # создать описание изменений
npx changeset version       # бампнуть версии и обновить CHANGELOG.md
npx changeset publish       # опубликовать пакеты
```

Поддержка обратной совместимости при развитии API — через period депрекации, а не мгновенное удаление:

```bash
npm version patch   # 1.2.0 -> 1.2.1, багфиксы
npm version minor   # 1.2.0 -> 1.3.0, новая функциональность без breaking changes
npm version major   # 1.2.0 -> 2.0.0, breaking changes
```

```js
// v1.4.0: помечаем старый метод устаревшим, но оставляем рабочим
export function fetchUser(id) {
  console.warn('[my-lib] fetchUser() is deprecated, use getUser() instead. Will be removed in v2.0.0');
  return getUser(id);
}
```
```bash
npm version minor   # 1.3.0 -> 1.4.0, добавили getUser(), fetchUser пока жив — не breaking
npm version major   # 1.x.x -> 2.0.0, только теперь удаляем fetchUser полностью
```

## Принципы настройки Git hooks с помощью Husky и lint-staged

Git hooks — скрипты, автоматически запускаемые Git на определённых событиях (`pre-commit`, `commit-msg`, `pre-push`). Husky упрощает их подключение и версионирование внутри репозитория (хуки лежат в `.husky/` и коммитятся, а не настраиваются вручную у каждого разработчика). lint-staged ограничивает проверки только изменёнными/застейдженными файлами, а не всем проектом — это делает `pre-commit` быстрым. Дорогие проверки (полный прогон тестов, типчек) принято переносить на `pre-push`, чтобы не тормозить каждый коммит.

```bash
npm install -D husky lint-staged
npx husky init
```

```bash
# .husky/pre-commit
npx lint-staged
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

Вынос более тяжёлой проверки (полный прогон тестов) в `pre-push`:

```bash
# .husky/pre-push
npm run test -- --run
npm run typecheck
```

## Методы анализа производительности: трассировка, профилирование, использование Chrome DevTools Performance

Анализ производительности начинается с записи трассы в DevTools → Performance: записывается timeline проблемного взаимодействия, затем разбирается main thread flame chart (задачи дольше 50мс — long tasks, блокирующие поток), секция Frames/FPS для дропнутых кадров и Bottom-Up/Call Tree для поиска "тяжёлых" функций. Отдельно профилируется память через Heap snapshot — сравнение двух снэпшотов до/после сценария выявляет утечки по растущему числу detached DOM nodes. Для регулярного контроля деградаций эти проверки автоматизируют в CI через Lighthouse CI с порогами (assertions), а не полагаются только на ручные разовые замеры.

1. Открыть DevTools → Performance → нажать Record → выполнить проблемное взаимодействие → Stop.
2. Анализировать timeline: main thread flame chart (долгие задачи > 50мс), секция Frames (fps, дропнутые кадры), Bottom-Up / Call Tree / Event Log, Layout Shift Regions и Rendering (layout thrashing).
3. CPU/Network throttling для эмуляции слабых устройств.

```bash
# Снятие heap snapshot через DevTools → Memory → Heap snapshot
# Сравнение двух снэпшотов для поиска утечек памяти (растущее число detached DOM nodes)
```

```yaml
- run: npx @lhci/cli autorun
```
```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

## Настройка Sentry для мониторинга ошибок в production

Sentry — платформа мониторинга ошибок и производительности: SDK инициализируется с DSN проекта, окружением и версией релиза, что позволяет привязывать регрессии к конкретным деплоям. Интеграции добавляют трассировку транзакций (`browserTracingIntegration`) и запись сессий (`replayIntegration`) с маскировкой чувствительного контента. React-приложения оборачивают в error boundary Sentry, чтобы падения компонентов тоже попадали в мониторинг, а `beforeSend` служит точкой фильтрации PII перед отправкой события. Sourcemaps загружаются отдельно, чтобы стектрейсы в дашборде показывали исходный, а не минифицированный код.

```bash
npm install @sentry/react
```
```js
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://<key>@o0.ingest.sentry.io/0',
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.2,        // сэмплирование транзакций для APM
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // фильтрация чувствительных данных перед отправкой
    if (event.request?.cookies) delete event.request.cookies;
    return event;
  },
});
```
```jsx
const App = Sentry.withErrorBoundary(RootComponent, {
  fallback: <ErrorFallback />,
});
```
```bash
npx sentry-cli sourcemaps upload --org my-org --project my-app ./dist
```

Анализ причины ошибки с использованием собранного контекста (user, breadcrumbs, теги):

```js
Sentry.setUser({ id: user.id, email: user.email });
Sentry.setContext('cart', { itemsCount: cart.items.length, total: cart.total });

try {
  await checkout(cart);
} catch (err) {
  Sentry.captureException(err, {
    tags: { feature: 'checkout' },
  });
  throw err;
}
```
Благодаря breadcrumbs, тегам и user-контексту в дашборде Sentry можно увидеть точный шаг сценария (например, конкретный шаг оформления заказа) и связать регресс с релизом через release tracking — это и есть анализ первопричины (root cause), а не просто фиксация факта ошибки.

## Использование Performance API: mark, measure, PerformanceObserver для точного измерения производительности приложения

Performance API — низкоуровневый браузерный интерфейс для точных ручных измерений, дополняющий DevTools и RUM-библиотеки. `performance.mark()` ставит именованную метку времени, `performance.measure()` считает интервал между двумя метками — это удобно для замера кастомных бизнес-сценариев (например, время конкретного запроса данных), которые не покрываются стандартными метриками. `PerformanceObserver` асинхронно подписывается на события производительности (LCP, CLS, long tasks, ресурсы) без опроса, что дешевле по нагрузке и точнее по времени фиксации, чем ручной polling.

```js
performance.mark('data-fetch-start');
await fetchData();
performance.mark('data-fetch-end');

performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');

const [entry] = performance.getEntriesByName('data-fetch');
console.log(entry.duration); // длительность в мс
```

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    sendToAnalytics({
      name: entry.name,
      value: entry.startTime,
      entryType: entry.entryType,
    });
  }
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
observer.observe({ type: 'first-input', buffered: true });
observer.observe({ entryTypes: ['resource', 'navigation', 'longtask'] });
```

```js
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.warn('Long task detected:', entry.duration, entry.attribution);
  });
}).observe({ type: 'longtask', buffered: true });
```

```js
performance.getEntriesByType('resource').forEach((r) => {
  if (r.duration > 1000) {
    console.warn(`Slow resource: ${r.name} took ${r.duration}ms`);
  }
});
```
