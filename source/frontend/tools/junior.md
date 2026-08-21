# Инструменты — Junior

## Основные команды npm/pnpm/yarn для установки зависимостей (install, add)

npm/yarn/pnpm — менеджеры пакетов Node.js, решают дерево зависимостей и кладут их в `node_modules`. `npm install` (или просто `yarn`/`pnpm install`) без аргументов ставит всё из `../../../package.json`; с аргументом — добавляет конкретный пакет и записывает его в `../../../package.json`. Флаг `-D`/`--save-dev` кладёт пакет в `devDependencies`, `-g`/`global add` — ставит глобально в системе. Между менеджерами разница в основном в скорости, формате lock-файла и модели хранения `node_modules` (pnpm использует общий content-addressable store и симлинки, экономя место).

```bash
npm install                 # установить все зависимости из package.json
npm install lodash          # установить lodash в dependencies
npm install -D eslint       # установить в devDependencies (--save-dev)
npm install -g typescript   # глобальная установка
npm install lodash@4.17.21  # конкретная версия
npm ci                      # чистая установка строго по package-lock.json (для CI)
npm uninstall lodash        # удалить пакет
npm update                  # обновить зависимости в рамках semver-диапазонов
```

```bash
yarn                        # установить все зависимости
yarn add lodash             # добавить в dependencies
yarn add -D eslint          # добавить в devDependencies
yarn add lodash@4.17.21     # конкретная версия
yarn global add typescript  # глобальная установка
yarn remove lodash          # удалить пакет
yarn upgrade                # обновить зависимости
```

```bash
pnpm install                # установить все зависимости
pnpm add lodash              # добавить в dependencies
pnpm add -D eslint           # добавить в devDependencies
pnpm add -g typescript       # глобальная установка
pnpm remove lodash           # удалить пакет
pnpm update                  # обновить зависимости
```

## Что такое package-lock.json/yarn.lock зависимостей

Lock-файл фиксирует точную, разрешённую версию каждого пакета (включая транзитивные зависимости) и её хэш-сумму (`integrity`), которые были получены на момент установки. Без него `../../../package.json` с диапазонами версий (`^`, `~`) может дать разные версии на разных машинах и в разное время, что ломает воспроизводимость сборки. Lock-файл коммитится в репозиторий и должен обновляться автоматически при `install`/`add`, а не редактироваться руками. В CI используют "чистую" установку строго по lock-файлу, чтобы гарантировать идентичность окружений.

```bash
npm ci                                  # ставит строго по package-lock.json, падает при рассинхроне
yarn install --frozen-lockfile
pnpm install --frozen-lockfile
```

Структура записи в `../../../package-lock.json` (npm ≥ v7, lockfileVersion 2/3):
```json
{
  "name": "my-app",
  "lockfileVersion": 3,
  "packages": {
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4..."
    }
  }
}
```

## Назначение ESLint и Prettier

ESLint — статический анализатор кода: находит потенциальные ошибки и нарушения стилевых/архитектурных правил (неиспользуемые переменные, `==` вместо `===`, нарушение правил хуков React и т.д.), правила настраиваются и расширяются через конфиг и плагины. Prettier — форматтер, который занимается только визуальным представлением кода (отступы, кавычки, точки с запятой), не проверяя логику. Их часто комбинируют: ESLint отвечает за качество кода, Prettier — за единообразие форматирования, а конфликтующие стилевые правила ESLint отключают через `eslint-config-prettier`.

```json
// .eslintrc.json
{
  "extends": ["eslint:recommended", "plugin:react/recommended"],
  "rules": {
    "no-unused-vars": "warn",
    "eqeqeq": "error",
    "react/prop-types": "off"
  }
}
```
```bash
npx eslint src/ --fix
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "all"
}
```
```bash
npx prettier --write src/
```

## Основные вкладки Browser DevTools: Elements (структура DOM), Console (логи), Network (запросы)

DevTools — встроенные инструменты браузера для отладки frontend-приложения. Elements показывает актуальное (после работы JS) дерево DOM и применённые CSS-стили выбранного элемента с возможностью правки на лету. Console — интерактивная JS-консоль в контексте страницы: вывод логов и выполнение произвольного кода. Network — журнал всех сетевых запросов страницы (XHR/fetch, статика) со статусами, заголовками, телом и временной диаграммой (waterfall) загрузки.

**Elements** — отображает живое дерево DOM и вычисленные CSS-стили для выбранного элемента: редактирование HTML/CSS на лету, Box Model в панели Computed, инспекция event listeners, `$0` в консоли для обращения к выбранному элементу.

**Console** — интерактивная JS-консоль, привязанная к контексту страницы: просмотр `console.log/warn/error/table/group`, выполнение произвольного JS, быстрые команды `$('selector')`, `$$('selector')`, `$0`-`$4`, `copy(obj)`.

**Network** — журнал сетевых запросов (XHR/fetch, документы, скрипты, стили, изображения, WebSocket): статус-коды, заголовки, тело запроса/ответа, waterfall (DNS, TCP, TTFB, download), фильтрация по типу, throttling, флаг "Preserve log".

## Библиотеки юнит-тестирования (Jest, Vitest)

Jest и Vitest — фреймворки для юнит-тестирования JS/TS: содержат test-runner, assertion-библиотеку (`expect`) и встроенный мокинг. Vitest создан как более быстрая альтернатива Jest, нативно работающая поверх Vite (ESM из коробки, шустрый watch-режим), с почти идентичным Jest API, что упрощает миграцию. Оба поддерживают `describe`/`it`/`test`, сбор покрытия кода (`--coverage`) и watch-режим для быстрой обратной связи при разработке.

```js
// sum.test.js (Jest)
import { sum } from './sum';

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});

describe('sum()', () => {
  it('handles negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3);
  });
});
```
```bash
npx jest --watch
npx jest --coverage
```

```js
// sum.test.js (Vitest)
import { describe, it, expect } from 'vitest';
import { sum } from './sum';

describe('sum', () => {
  it('adds numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```
```bash
npx vitest
npx vitest run --coverage
```

---
