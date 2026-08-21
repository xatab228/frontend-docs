# Сборка и организация кода — Senior

## Как Vite использует ES-модули для быстрой разработки и сборки

В dev-режиме Vite не бандлит приложение целиком: браузер сам запрашивает модули по мере необходимости через нативный `import`, а Vite отдаёт их on-the-fly, транспилируя каждый файл по отдельности (через esbuild — на порядки быстрее Babel/tsc). Зависимости из node_modules предварительно бандлятся один раз (pre-bundling через esbuild) для сокращения количества запросов и совместимости с CJS. Для production Vite переключается на Rollup, который делает полноценный бандлинг, tree shaking и code splitting.

## Что такое Module Federation и как оно позволяет динамически загружать части приложения из разных микросервисов

Module Federation (Webpack 5, также портирован в Vite/Rollup через плагины) — механизм, позволяющий нескольким независимо собранным и задеплоенным JS-приложениям делиться модулями (компонентами, хуками, утилитами) в рантайме, а не на этапе сборки.

Ключевая идея: каждое приложение (`remote`) публикует манифест (`remoteEntry.js`) со списком «эксплуатируемых» модулей. Другое приложение (`host`) во время выполнения по URL загружает этот `remoteEntry.js` и динамически импортирует нужный модуль через асинхронный `import()`.

```js
// remote (host для микрофронтенда "products")
// webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductList': './src/components/ProductList',
      },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
    }),
  ],
};
```

```js
// host-приложение
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    products: 'products@https://products.example.com/remoteEntry.js',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});
```

```jsx
// использование в host
const ProductList = React.lazy(() => import('products/ProductList'));
```

## Различные стратегии использования Module Federation (например, shared dependencies, remote containers)

- **exposes** — какие модули текущее приложение отдаёт наружу.
- **remotes** — статическая или **динамическая** регистрация remotes (URL определяется в рантайме через реестр приложений).
- **shared dependencies** — общие библиотеки не дублируются в каждом remote, а берутся из общего scope; настраивается `singleton`, `requiredVersion`, `strictVersion`, `eager`.
- **Bidirectional hosts** — приложение одновременно и host, и remote.
- **Fallback / error boundary** — оборачивание `React.lazy(() => import('remote/X'))` в `Suspense` + `ErrorBoundary`, чтобы падение удалённого микрофронтенда не рушило весь host.

## Различные стратегии использования лоадеров для оптимизации сборки

```js
// webpack.common.js — базовый конфиг, расширяемый в каждом пакете монорепо
const path = require('path');

module.exports = (pkgDir) => ({
  context: pkgDir,
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'packages/shared/src') },
    // позволяет пакетам монорепо ссылаться друг на друга по алиасу,
    // не публикуя каждый раз промежуточные версии в npm
  },
  module: {
    rules: [{ test: /\.tsx?$/, loader: 'ts-loader', options: { transpileOnly: true } }],
  },
});
```
```js
// packages/app-a/webpack.config.js
const merge = require('webpack-merge');
const common = require('../../webpack.common.js')(__dirname);
module.exports = merge(common, { entry: './src/index.tsx' });
```
Оптимизация через `transpileOnly: true` (типы проверяются отдельно через `fork-ts-checker-webpack-plugin` в параллельном процессе, не блокируя сборку), кэширование результатов loader'ов (`cache-loader`/встроенный filesystem cache Webpack 5), и ограничение области действия правил (`include`/`exclude`) для сокращения числа обрабатываемых файлов.

## Как работают плагины на уровне Webpack API (например, compiler.hooks)

```js
// my-loader.js — простой кастомный loader, добавляющий баннер в начало файла
module.exports = function (source) {
  const banner = `/* processed by my-loader at ${new Date().toISOString()} */\n`;
  return banner + source;
};
```
Пример собственного плагина через `compiler.hooks` (система хуков библиотеки `tapable`):

```js
class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      const banner = '/* built at ' + new Date().toISOString() + ' */\n';
      for (const name of Object.keys(compilation.assets)) {
        const asset = compilation.assets[name];
        const source = banner + asset.source();
        compilation.assets[name] = {
          source: () => source,
          size: () => source.length,
        };
      }
      callback();
    });

    compiler.hooks.done.tap('MyPlugin', (stats) => {
      console.log('Build finished in', stats.endTime - stats.startTime, 'ms');
    });
  }
}
```
Плагин получает объект `compiler` и подписывается на хуки его жизненного цикла (`compile`, `emit`, `done` и др.) через `tapable`. В отличие от loader'ов, работающих с содержимым одного файла, плагины имеют доступ ко всему состоянию сборки (`compilation`) — списку ассетов, графу модулей, статистике — и могут вмешиваться на любом этапе.

## Методы Code Splitting

- **Route-based splitting** — разбиение по маршрутам приложения (`React.lazy` + `React Router`, `Vue Router` с динамическими `import()` на уровне route-компонентов).
- **Component-based splitting** — ленивая загрузка тяжёлых компонентов (модалки, редакторы, графики) только при их реальном использовании.
- **Vendor splitting** — вынос стабильных сторонних библиотек в отдельный чанк.
```js
optimization: {
  splitChunks: {
    chunks: 'all',
    maxInitialRequests: 25,
    cacheGroups: {
      defaultVendors: { test: /[\\/]node_modules[\\/]/, priority: -10, reuseExistingChunk: true },
      common: { minChunks: 2, priority: -20, reuseExistingChunk: true },
    },
  },
  runtimeChunk: 'single',
},
```
- **Prefetch/Preload hints** — `import(/* webpackPrefetch: true */ './Modal')` подсказывает браузеру загрузить чанк заранее в свободное время, `webpackPreload` — загрузить параллельно с родительским чанком с высоким приоритетом.

## Стратегии кэширования (например, использование [contenthash] для файлов)

- `[contenthash]` — хэш вычисляется от содержимого конкретного файла; меняется только когда меняется сам файл (в отличие от `[hash]`, который общий на всю сборку, и `[chunkhash]`, общий на чанк, включая его зависимости).
```js
output: {
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[name].[contenthash:8].chunk.js',
},
```
- **runtimeChunk: 'single'** — вынос webpack runtime (манифеста модулей) в отдельный маленький файл, чтобы изменение одного модуля не сбивало хэш всех остальных чанков.
- **Разделение vendor/app кода** — vendor-код меняется редко → долго живёт в кэше браузера/CDN независимо от частых изменений прикладного кода.
- **HTTP-уровень**: immutable-ассеты с хэшем в имени + `Cache-Control: immutable`, `index.html` — без кэша или с коротким TTL.

## Принципы оптимизации source maps для production (например, выбор между hidden-source-map и source-map)

- `source-map` — генерирует полноценную карту и добавляет `//# sourceMappingURL=...` комментарий в конце бандла — риск раскрытия исходного кода публично.
- `hidden-source-map` — генерирует `.map`-файл, но **не** добавляет ссылку на него в бандл. Файл загружается на сервер ошибок (Sentry, Bugsnag) отдельно и вручную сопоставляется со стектрейсами.
- `nosources-source-map` — карта содержит информацию о строках/файлах, но не сам исходный код.

Практическая команда для загрузки карт в Sentry без публикации на CDN:
```bash
webpack --config webpack.prod.js
sentry-cli sourcemaps upload --release=1.4.0 ./dist
rm ./dist/*.map  # карты не деплоятся на CDN, только используются для error-tracking
```

## Методы и инструменты для анализа и улучшения производительности бандла (например, Tree Shaking, минификация CSS/JS)

```js
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```
```bash
npx webpack --config webpack.prod.js
# открыть dist/bundle-report.html — treemap с вкладом каждого модуля в итоговый размер
```
Помимо анализатора: `usedExports`/`sideEffects: false` для эффективного tree shaking, минификация Terser (JS) и cssnano (CSS), удаление дублирующихся зависимостей (`npm dedupe`, анализ через `npm ls`), динамические импорты для отсечения неиспользуемого кода от первоначальной загрузки.

## Настройка Babel для сложных случаев (preset-env, browserslist, полифиллы)

`@babel/preset-env` сам решает, какие трансформации включить — на основании списка целевых браузеров. Источник этого списка — `browserslist`, поэтому матрица совместимости задаётся один раз и используется и Babel, и Autoprefixer, и Vite/esbuild.

```json
// package.json — единый источник правды о поддерживаемых браузерах
{
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "not dead",
    "not op_mini all"
  ]
}
```

```js
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      // полифиллы добавляются только под реально используемые API и целевые браузеры
      useBuiltIns: 'usage',
      corejs: { version: '3.36', proposals: false },
      bugfixes: true,        // точечные обходы багов вместо целых трансформаций
      modules: false,        // модули оставляем ESM — иначе ломается tree shaking
    }],
  ],
  plugins: [
    // в библиотеке — helpers выносятся в общий рантайм, а не дублируются в каждом модуле
    ['@babel/plugin-transform-runtime', { corejs: false, helpers: true, regenerator: true }],
  ],
  // разные цели для разных сборок: современный бандл и legacy-бандл
  env: {
    modern: { presets: [['@babel/preset-env', { targets: { esmodules: true } }]] },
    legacy: { presets: [['@babel/preset-env', { targets: { ie: '11' } }]] },
  },
}
```

Что важно на senior-уровне:

- **`useBuiltIns: 'usage'` против `'entry'`.** `usage` анализирует код и добавляет только нужные полифиллы; `entry` разворачивает импорт core-js целиком по таргетам — предсказуемее, но тяжелее. Для библиотек оба варианта неуместны: полифиллы решает подключать приложение.
- **`transform-runtime` для библиотек.** Без него хелперы Babel копируются в каждый модуль и раздувают бандл потребителя, а полифиллы протекают в глобальную область.
- **Не транспилировать лишнего.** Агрессивные таргеты (ie 11) отключают нативные классы, async/await и spread — код становится больше и медленнее на современных браузерах. Отсюда стратегия differential serving: современный бандл через `type="module"`, legacy — через `nomodule`.
- **`node_modules` обычно исключают** из транспиляции, но пакеты, публикующие современный синтаксис, приходится добавлять в исключения из исключений — иначе legacy-сборка падает в рантайме.

## Различные стратегии выбора target для разных окружений (например, CommonJS для Node.js, ESM для браузеров)

```js
// rollup.config.js
export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/mylib.umd.js', format: 'umd', name: 'MyLib', globals: { react: 'React' } },
    { file: 'dist/mylib.esm.js', format: 'es' },
    { file: 'dist/mylib.cjs.js', format: 'cjs' },
  ],
  external: ['react'],
};
```
`module`-поле используют бандлеры (Webpack/Rollup) для tree shaking (т.к. это ESM-версия), `main` — Node.js/старые инструменты, UMD-файл — для прямого подключения через CDN (`<script src="https://unpkg.com/mylib">`). Дополнительно возможна **дифференциальная загрузка** (differential serving): сборка `modern` (ESM, `<script type="module">`) и `legacy` (`<script nomodule>`, с полифиллами) версий бандла, например через `@vitejs/plugin-legacy`.

## Как использовать UMD для публикации универсальных библиотек

При публикации библиотеки в npm, которая должна работать и в Node (CJS), и в браузере через `<script>`, и в AMD-загрузчиках, выходной формат UMD решает эту задачу единым файлом — он определяет окружение выполнения в рантайме и подключается соответствующим образом.

```js
// rollup.config.js
export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/mylib.umd.js', format: 'umd', name: 'MyLib', globals: { react: 'React' } },
    { file: 'dist/mylib.esm.js', format: 'es' },
    { file: 'dist/mylib.cjs.js', format: 'cjs' },
  ],
  external: ['react'],
};
```
В `../../../package.json` указываются точки входа под разные потребители, чтобы бандлеры выбирали оптимальный формат автоматически:
```json
{
  "main": "dist/mylib.cjs.js",
  "module": "dist/mylib.esm.js",
  "unpkg": "dist/mylib.umd.js",
  "exports": {
    ".": {
      "import": "./dist/mylib.esm.js",
      "require": "./dist/mylib.cjs.js"
    }
  }
}
```

## Особенности использования AMD и SystemJS в устаревших проектах

**AMD (Asynchronous Module Definition)** — модульный формат для браузера, предшествовавший ES-модулям: модули оборачиваются в `define(['dep1', 'dep2'], function(dep1, dep2) {...})`, зависимости грузятся асинхронно через загрузчики вроде RequireJS. Использовался до появления бандлеров, когда модули нужно было грузить прямо в браузере без этапа сборки.

**SystemJS** — универсальный загрузчик модулей в рантайме, способный загружать AMD, CommonJS, UMD и ES-модули по единому API (`System.import(...)`), часто применялся как переходное решение при постепенной миграции legacy-приложений на ESM без немедленной полной пересборки всего кода.

В современных проектах оба формата встречаются в основном как output-таргет для legacy-совместимости (например, `format: 'amd'` в Rollup) или в старых enterprise-кодовых базах, ещё не мигрировавших на Webpack/Vite.
