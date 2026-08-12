# Архитектура Web приложений — Middle

### Принципы FSD (Feature-Sliced Design)

FSD — методология организации фронтенд-кода, строится на слоях (`app`, `pages`, `widgets`, `features`, `entities`, `shared` — строгая иерархия зависимостей, слой может использовать только нижележащие слои) и срезах внутри них (`entities/user`, `features/add-to-cart`), которые делятся на сегменты (`ui/`, `model/`, `api/`, `lib/`, `config/`). Правило импортов: `features` не может импортировать другой `features` напрямую, только через `entities`/`shared` либо композицию на уровне `widgets`/`pages`. Каждый срез имеет публичный API через `index.ts`, скрывающий внутреннюю реализацию.

Практическая структура, комбинирующая FSD (бизнес-срезы) и атомарный дизайн (внутри `shared/ui`):

```
src/
  app/                     — providers, роутинг, глобальные стили
  pages/
    product-page/
  widgets/
    header/
    product-gallery/
  features/
    add-to-cart/
      ui/ model/ api/
  entities/
    product/
      ui/ model/ api/
  shared/
    ui/                    — атомарный дизайн внутри shared
      atoms/    (Button, Input, Icon)
      molecules/ (SearchBar, FormField)
      organisms/ (Header, Footer)
    lib/
    api/
```

### Как распознать Большой ком грязи (ball of mud)

"Big Ball of Mud" — антипаттерн архитектуры без чёткой структуры. Признаки: всё зависит от всего (циклические импорты, deep-import через `../../../../`), отсутствие единого стиля структуры, God-объекты, копипаст вместо переиспользования, отсутствие границы UI и бизнес-логики, изменение в одном месте ломает несвязанные части, страх рефакторинга, бесполезные тесты. Распознаётся по субъективным сигналам команды ("боимся трогать этот модуль") и объективным метрикам (высокая связанность файлов, циклические зависимости в графе импортов).

Практика избегания: ESLint-правило, запрещающее deep-import и циклические зависимости, плюс явный public API через `index.ts`.

```js
// .eslintrc.js
module.exports = {
  rules: {
    // запрещает импорт мимо public API среза, например
    // import { helper } from 'features/add-to-cart/model/internal-helper'
    'import/no-internal-modules': ['error', {
      allow: ['*/index', '*.css'],
    }],
    'import/no-cycle': 'error',
  },
};
```

```ts
// features/add-to-cart/index.ts — единственная разрешённая точка входа в срез
export { AddToCartButton } from './ui/AddToCartButton';
export { useAddToCart } from './model/useAddToCart';
// internal-helper.ts НЕ экспортируется — недоступен снаружи среза
```

### Принципы SSR (Server-Side Rendering) и SSG (Static Site Generation)

**SSR** — HTML генерируется на сервере при каждом запросе, дальше происходит гидратация (клиентский JS "оживляет" статичный HTML). Плюсы: быстрый FCP, хорошее SEO, лучше работает на слабых устройствах. Минусы: нагрузка на сервер, возможен "uncanny valley" при тяжёлой гидратации. **SSG** — HTML генерируется заранее на этапе сборки и раздаётся как статика через CDN. Плюсы: максимальная скорость, минимальная нагрузка на бэкенд, отличное SEO. Минусы: не подходит для часто меняющихся данных без ISR (Incremental Static Regeneration).

Практическая реализация на Next.js — одна и та же кодовая база, разные стратегии рендеринга на уровне страницы:

```jsx
// pages/product/[id].js — SSR: данные свежие на каждый запрос
export async function getServerSideProps({ params }) {
  const product = await fetchProduct(params.id);
  return { props: { product } };
}

// pages/blog/[slug].js — SSG: генерируется один раз при сборке
export async function getStaticProps({ params }) {
  const post = await fetchPost(params.slug);
  return { props: { post }, revalidate: 3600 }; // ISR: пересборка раз в час
}

export async function getStaticPaths() {
  const posts = await fetchAllPostSlugs();
  return {
    paths: posts.map((slug) => ({ params: { slug } })),
    fallback: 'blocking',
  };
}
```

### Монорепозиторий vs пакеты (плюсы и минусы)

Монорепозиторий — один Git-репозиторий с несколькими логически отдельными проектами/пакетами (`apps/web`, `packages/ui-kit`). Плюсы: атомарные изменения сразу во всех зависимых пакетах, простое переиспользование кода, единые инструменты и версии зависимостей, прозрачность влияния изменений. Минусы: требует зрелой CI-инфраструктуры (affected-builds, кеширование), больший размер репозитория, более сложный контроль доступа. Альтернатива — раздельные пакеты в разных репозиториях (polyrepo): проще изоляция и права доступа, но версии синхронизируются вручную через registry, а сквозные изменения требуют нескольких PR и релизов.

Практическая конфигурация Turborepo + PNPM workspaces:

```
repo/
  apps/
    web/          package.json (depends on "@acme/ui": "workspace:*")
    admin/
  packages/
    ui/           package.json (name: "@acme/ui")
    utils/
  pnpm-workspace.yaml
  turbo.json
```

```json
// turbo.json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test":  { "dependsOn": ["build"] },
    "lint":  {}
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

Команда `turbo run build --filter=web` соберёт только `web` и её зависимости (`@acme/ui`), используя build-кеш для непострадавших пакетов. Публикация отдельного пакета из монорепо в npm registry:

```json
// packages/ui/package.json
{
  "name": "@acme/ui",
  "version": "1.2.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepublishOnly": "npm run build"
  }
}
```

### Принципы работы с глобальным состоянием

Глобальное состояние — данные, нужные многим несвязанным частям дерева компонентов. Ключевые принципы: разделение состояния по природе (UI-состояние, серверное состояние, состояние формы — каждое своим инструментом), единый источник правды, нормализация данных по ID, однонаправленный поток данных, минимизация глобального состояния (используем его только когда действительно нужно шарить данные между несвязанными компонентами), селекторы и мемоизация против лишних ре-рендеров.

Практика — Zustand-стор для координации корзины между Header и страницей товара:

```js
// shared/model/cartStore.js
import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  addItem: (product) =>
    set((state) => ({ items: [...state.items, product] })),
  totalCount: () => useCartStore.getState().items.length,
}));

// widgets/header/Header.jsx
function CartIcon() {
  const count = useCartStore((s) => s.items.length); // мемоизированная подписка
  return <span>🛒 {count}</span>;
}

// features/add-to-cart/AddToCartButton.jsx
function AddToCartButton({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  return <button onClick={() => addItem(product)}>В корзину</button>;
}
```
