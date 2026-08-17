# Инструменты — Middle

### Принципы работы с workspaces для управления зависимостями в монорепозиториях

Workspaces (npm/yarn/pnpm) позволяют держать несколько пакетов в одном репозитории и управлять ими как единым целым: общий `node_modules` в корне, симлинки между локальными пакетами вместо публикации в реестр, единая установка зависимостей одной командой. Список пакетов задаётся глобом в корневом `../../../package.json` (npm/yarn) или отдельном `pnpm-workspace.yaml`. Команды можно выполнять точечно для одного пакета (`--workspace`/`--filter`) или сразу для всех (`--workspaces`/`-r`), что упрощает CI и локальную разработку в монорепо.

```json
// package.json (корень)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```
```bash
npm install                                  # ставит зависимости всех воркспейсов
npm install lodash --workspace=packages/ui   # добавить зависимость в конкретный пакет
npm run build --workspace=apps/web           # запустить скрипт в конкретном пакете
npm run test --workspaces                    # запустить скрипт во всех пакетах
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```
```bash
pnpm add lodash --filter @myorg/ui
pnpm --filter @myorg/web run build
pnpm -r run test         # recursive — во всех пакетах
```

### Методы оптимизации установки зависимостей

Установку ускоряют за счёт кэширования (кэш пакетного менеджера в CI между запусками), офлайн/прежде-скачанного режима (`prefer-offline`) и отключения ненужных сетевых проверок (`audit`, `fund`). В Docker важен порядок слоёв: сначала копируются только манифесты (`../../../package.json` + lock-файл) и ставятся зависимости, и лишь потом остальной код — так слой с `node_modules` кэшируется и не пересобирается при каждом изменении исходников. pnpm сам по себе экономит место и время за счёт единого content-addressable store и жёстких линков вместо копирования файлов пакетов.

```yaml
# GitHub Actions
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
```

```ini
# .npmrc
prefer-offline=true
fund=false
audit=false
```

```dockerfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
```

### Процесс публикации npm-пакетов

Публикация пакета включает: логин в реестр, задание версии по semver, указание точек входа (`main`/`module`/`types`/`exports`) и списка публикуемых файлов (`files`), затем сама команда `npm publish`. Для scoped-пакетов (`@org/name`) по умолчанию нужен явный `--access public`, иначе пакет уйдёт как приватный. Промежуточные/нестабильные релизы публикуют под отдельным dist-тегом (например `beta`), не трогая `latest`, а инструменты вроде `changesets` автоматизируют версионирование, генерацию CHANGELOG и сам publish в CI.

```json
{
  "name": "@myorg/my-lib",
  "version": "1.2.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": { "access": "public" }
}
```
```bash
npm login
npm publish --access public       # для scoped-пакетов (@org/name) по умолчанию private
npm publish --tag beta            # публикация под дистрибутивным тегом (не latest)
```

### Основные метрики WebVitals (LCP, FID, CLS), использование Lighthouse

Core Web Vitals — набор метрик реального пользовательского опыта: LCP (Largest Contentful Paint) — время отрисовки самого крупного видимого элемента (скорость загрузки), FID/INP (First Input Delay / Interaction to Next Paint) — задержка отклика на первое взаимодействие (отзывчивость), CLS (Cumulative Layout Shift) — суммарный "прыгучий" сдвиг макета во время загрузки (визуальная стабильность). Lighthouse — инструмент аудита (встроен в DevTools и доступен как CLI), который прогоняет страницу по чек-листу performance/accessibility/SEO/best practices и выдаёт числовые метрики и рекомендации по каждой из них.

```bash
npx lighthouse https://example.com --view
npx lighthouse https://example.com --output=json --output-path=./report.json
```

Дополнительно — встраивание оценки в CI, чтобы не полагаться на разовый ручной запуск:

```bash
npx lighthouse https://staging.example.com --output=json --output-path=./lh-report.json --only-categories=performance
```
```json
// package.json (фрагмент)
{
  "scripts": {
    "perf:audit": "lighthouse http://localhost:3000 --view --preset=desktop"
  }
}
```

Замер метрик на реальных пользователях (RUM) через библиотеку `web-vitals` и разбор причины плохого CLS:

```js
import { onLCP, onCLS, onINP } from 'web-vitals';

function sendToAnalytics(metric) {
  navigator.sendBeacon('/analytics', JSON.stringify(metric));
}

onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

```js
import { onCLS } from 'web-vitals';

onCLS((metric) => {
  // смотрим source элементов, вызвавших сдвиг макета
  metric.entries.forEach((entry) => {
    entry.sources?.forEach((s) => console.warn('Layout shift caused by:', s.node));
  });
});
```
```css
/* Типичное исправление: резервируем место под изображение заранее */
img.hero {
  aspect-ratio: 16 / 9;
  width: 100%;
}
```

---
