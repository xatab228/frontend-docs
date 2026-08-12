# Сборка и организация кода — Middle

### Различия в производительности между Webpack, Rollup, Vite, tsc

Vite в dev-режиме не бандлит вообще — отдаёт файлы браузеру как нативные ES-модули, поэтому старт почти мгновенный независимо от размера проекта. Webpack строит полный граф зависимостей и пересобирает бандл (пусть и инкрементально через HMR) при каждом изменении, что медленнее на больших проектах. Rollup обычно быстрее Webpack на сборке библиотек за счёт более простого пайплайна и хорошего tree shaking, но менее гибок для приложений с ассетами. tsc — не бандлер, а компилятор: его скорость зависит от объёма проверки типов, и он часто используется в связке с более быстрым транспилятором (esbuild/swc) для скорости, оставляя tsc только для type-checking.

### Принцип работы лоадеров (например, цепочка обработки файлов)

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      { test: /\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource', // современный аналог file-loader в Webpack 5
        generator: { filename: 'images/[hash][ext]' },
      },
    ],
  },
};
```
Лоадеры в массиве `use` применяются справа налево (снизу вверх): для `.scss`-файла сначала `sass-loader` компилирует Sass в обычный CSS, затем `css-loader` разбирает `@import`/`url()` и превращает CSS в CommonJS-модуль, и наконец `style-loader` инжектит результат в `<style>` тег. Каждый loader — чистая функция, принимающая исходное содержимое файла и возвращающая трансформированное.

### Основные типы плагинов для создания полноценного приложения

```js
// webpack.config.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  output: { clean: true }, // встроенная замена CleanWebpackPlugin в Webpack 5
  module: {
    rules: [
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
    ],
  },
  plugins: [new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' })],
};
```
Условно плагины делятся на: генерирующие HTML (`HtmlWebpackPlugin`), извлекающие/оптимизирующие ассеты (`MiniCssExtractPlugin`, `CopyWebpackPlugin`), управляющие переменными окружения (`DefinePlugin`), анализирующие бандл (`BundleAnalyzerPlugin`) и очищающие/кэширующие вывод сборки.

### Как работают полифиллы и зачем они нужны

Полифилл — код, реализующий API, отсутствующее в целевой среде выполнения (например, `Promise`, `Array.prototype.flat`, `fetch` в старых браузерах), чтобы код, написанный с расчётом на современные фичи, продолжал работать в старых окружениях.

Инструменты:
- `core-js` — основная библиотека полифиллов для ECMAScript.
- `@babel/preset-env` с `useBuiltIns: 'usage'` — автоматически добавляет только нужные полифиллы на основе `browserslist` и реально используемых фич в коде.

```json
// .browserslistrc
> 0.5%, last 2 versions, Firefox ESR, not dead
```
```js
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { useBuiltIns: 'usage', corejs: 3 }],
  ],
};
```

### Что такое Code Splitting

Code Splitting — разбиение итогового бандла на несколько чанков, загружаемых по требованию (например, по маршруту) или параллельно (vendor-код отдельно от прикладного), вместо одного огромного файла. Уменьшает первоначальное время загрузки приложения, так как браузер грузит только нужный на данный момент код.

### Зачем нужны source maps и их типы

Source map — файл, сопоставляющий строки/столбцы минифицированного/скомпилированного кода с исходным кодом, что позволяет отлаживаться и читать стектрейсы ошибок в исходном, а не преобразованном виде.

- `source-map` — генерирует полноценную карту и добавляет `//# sourceMappingURL=...` комментарий в конце бандла — риск раскрытия исходного кода публично.
- `hidden-source-map` — генерирует `.map`-файл, но не добавляет ссылку на него в бандл; загружается отдельно на сервер ошибок (Sentry, Bugsnag).
- `nosources-source-map` — карта содержит информацию о строках/файлах, но не сам исходный код.
- `eval-source-map` — быстрый вариант для разработки, встраивает карты через `eval()`.

### Методы оптимизации ассетов

```js
// webpack.config.js
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      '...',
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminMinify,
          options: {
            plugins: [
              ['mozjpeg', { quality: 75 }],
              ['pngquant', { quality: [0.6, 0.8] }],
              ['svgo', {}],
            ],
          },
        },
      }),
    ],
  },
};
```
Помимо сжатия изображений: минификация JS/CSS, вынос в отдельные чанки с кэшируемыми хэшами, lazy-loading изображений, конвертация в современные форматы (WebP/AVIF), инлайнинг мелких файлов через `asset/inline` вместо отдельного HTTP-запроса.

### Назначение UMD и IIFE

**IIFE (Immediately Invoked Function Expression)** — формат вывода, оборачивающий весь код в самовызывающуюся функцию, создающую изолированную область видимости и (опционально) экспортирующую единственную глобальную переменную. Подходит для подключения через простой `<script>` тег без модульной системы.
```js
(function (global, factory) {
  global.MyLib = factory();
})(this, function () { return { hello: () => 'hi' }; });
```
**UMD (Universal Module Definition)** — паттерн, который определяет, в каком окружении выполняется код (AMD, CommonJS, глобальная переменная браузера), и подключается соответствующим образом. Используется при публикации библиотек, которые должны работать в разных средах.

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

### Как настроить прокси для API-запросов в Webpack/Vite

Нужно, чтобы фронтенд dev-сервер перенаправлял запросы (например, `/api/*`) на бэкенд, избегая проблем с CORS в разработке.

```js
// webpack.config.js (webpack-dev-server)
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    },
  },
};
```

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
};
```

### Как использовать переменные окружения в разных средах (development, production)

```bash
# .env.staging
VITE_API_URL=https://staging-api.example.com
```
```bash
npm run build -- --mode staging
```
```js
// vite.config.js
export default ({ mode }) => ({
  define: {
    __APP_ENV__: JSON.stringify(mode),
  },
});
```
Для Webpack переменные окружения обычно подставляются через `DefinePlugin`/`EnvironmentPlugin`, значения читаются из `.env` файлов с помощью `dotenv`:

```js
// webpack.config.js
const { DefinePlugin } = require('webpack');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

module.exports = {
  plugins: [
    new DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),
  ],
};
```

---
