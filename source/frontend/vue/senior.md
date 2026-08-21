# Vue — Senior

#### Vue Core

##### Предназначение дополнительных хуков и как с ними работать (shallowRef, customRef, readonly, toRefs, toRef)
`shallowRef` делает реактивным только `.value` без глубокого отслеживания вложенных полей (производительность на больших структурах). `customRef` позволяет вручную контролировать отслеживание (`track`) и оповещение (`trigger`), например для дебаунса. `readonly` защищает от мутаций, `toRefs`/`toRef` превращают поля reactive-объекта в отдельные ref, сохраняя реактивность при извлечении.

```js
function useDebouncedRef(value, delay = 200) {
  let timeout
  return customRef((track, trigger) => ({
    get() { track(); return value },
    set(newValue) {
      clearTimeout(timeout)
      timeout = setTimeout(() => { value = newValue; trigger() }, delay)
    }
  }))
}
```

##### Как избегать избыточной реактивизации структур данных во Вue 3 (shallowRef) и Vue 2 (поля на экземпляре + Vue.set)
Во Vue 3 тяжёлые/неизменяемые объекты оборачивают в `shallowRef` или `markRaw`, чтобы Proxy не рекурсивно оборачивал вложенные поля. Во Vue 2 избыточную реактивизацию ограничивали, храня данные вне `data()` (на экземпляре напрямую) и добавляя реактивные поля точечно через `Vue.set`.

```js
import { markRaw } from 'vue'
const map = markRaw(new HeavyMapLibrary())
```

##### Как работает расширение структуры SFC новыми блоками через vue-loader
`vue-loader` (и аналогичный плагин Vite) разбирает `.vue`-файл на блоки по тегам верхнего уровня; кастомные блоки (например, `<i18n>` от `vue-i18n`) обрабатываются собственными loader'ами/плагинами, зарегистрированными под тип блока, расширяя стандартный набор `template/script/style`.

##### Эксперементальные возможности `<Suspense>` и "Signals"
`<Suspense>` координирует отображение fallback-контента, пока вложенные асинхронные компоненты/`async setup` не разрешатся.

```vue
<template>
  <Suspense>
    <template #default><AsyncUserProfile /></template>
    <template #fallback><Spinner /></template>
  </Suspense>
</template>
```
"Signals" — экспериментальное направление в развитии реактивности (родственное `ref`), нацеленное на более гранулярное и предсказуемое отслеживание зависимостей.

##### Как писать свои рендер-фукнции
Render-функция вызывает `h(tag, props, children)` напрямую вместо шаблона — даёт полный контроль над деревом, полезно для рекурсивных или динамически конструируемых структур.

```js
import { h, ref } from 'vue'
export default {
  setup() {
    const count = ref(0)
    return () => h('button', { onClick: () => count.value++ }, `Count: ${count.value}`)
  }
}
```
Рекурсивный компонент дерева категорий проще выразить render-функцией, чем шаблоном, расширяя пример до рекурсивного вызова `h(TreeNode, { node: child })` для каждого потомка.

##### Сильные и слабые стороны Vue, как фреймворка
Сильные стороны: низкий порог входа, единый официальный стек (Router/Pinia), гибкость между декларативным шаблоном и низкоуровневыми render-функциями, хорошая производительность за счёт compiler-оптимизаций. Слабые стороны: меньшая экосистема и меньший рынок труда по сравнению с React, исторически более резкий переход Vue 2 → Vue 3.

##### Случаи и аргументы, когда необходимо НЕ придерживаться каких-либо правил из официального Style Guide Vue
Например, в headless-библиотеке компонентов допустимо однословное имя корневого компонента, если это часть согласованного пространства имён пакета; или сознательно не используют `key` в `v-for` со статичным списком без изменений порядка ради небольшого выигрыша производительности — с явным обоснованием в комментарии.

##### Причины, по которым произошел качественный переход на Vue 3, какие проблемы Vue 2 лежали в корне
Vue 2 упирался в ограничения `Object.defineProperty` (нет отслеживания новых свойств/индексов массива), проблемы с типизацией TypeScript в Options API, отсутствие нормального переиспользования логики без миксинов (конфликты имён) и монолитный неделимый рантайм без tree-shaking. Vue 3 переписан на Proxy-реактивность, Composition API и модульную архитектуру.

##### Разные стратегии переиспользования кода (mixins, composables, renderless-компоненты, плагины и др.)
Миксины (Vue 2, склонны к конфликтам имён), composables (Vue 3, явные зависимости, без конфликтов), headless/renderless-компоненты (логика в компоненте, разметка отдаётся через scoped slot), плагины (`app.use`) для сквозной функциональности на уровне приложения.

```vue
<!-- Headless: логика в composable, вся разметка отдаётся потребителю через scoped slot -->
<script setup>
const { items, toggle, isOpen } = useDropdown()
defineExpose({})
</script>
<template>
  <slot :items="items" :toggle="toggle" :isOpen="isOpen" />
</template>
```

##### Проблемы системы реактивности во Vue 2
`Object.defineProperty` не перехватывает добавление новых свойств объекта и изменение массива по индексу/длине — требовались обходные пути (`Vue.set`, методы-мутаторы массива), что было источником трудноуловимых багов при обновлении вложенных структур.

##### Проблемы шаринга логики через миксины во Vue 2, какие новые проблемы это создает
Миксины неявно сливают свои свойства/методы в компонент, из-за чего сложно понять источник конкретного поля ("magic property"), а также возможны конфликты имён между несколькими миксинами, которые молча перезаписывают друг друга.

##### Headless-компоненты и logic-first архитектура

Headless-компонент содержит только поведение (состояние, обработчики, доступность) и не навязывает разметку — она приходит через scoped-слоты. Logic-first подход идёт дальше: поведение живёт в composable, а компонент-обёртка нужен лишь тем, кому удобнее слот, чем хук.

```ts
// useCombobox.ts — вся логика без единого тега
export function useCombobox<T>(items: MaybeRefOrGetter<T[]>, toLabel: (i: T) => string) {
  const query = ref('')
  const activeIndex = ref(-1)
  const open = ref(false)
  const filtered = computed(() =>
    toValue(items).filter(i => toLabel(i).toLowerCase().includes(query.value.toLowerCase()))
  )
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') activeIndex.value = (activeIndex.value + 1) % filtered.value.length
    if (e.key === 'Escape') open.value = false
  }
  return { query, filtered, activeIndex, open, onKeydown }
}
```

```vue
<!-- ComboboxRoot.vue — headless-обёртка: отдаёт состояние наружу, не рисует UI -->
<script setup lang="ts" generic="T">
const props = defineProps<{ items: T[]; toLabel: (i: T) => string }>()
const api = useCombobox(() => props.items, props.toLabel)
</script>

<template>
  <slot v-bind="api" />
</template>
```

```vue
<!-- Потребитель полностью владеет разметкой и стилями -->
<ComboboxRoot :items="users" :to-label="u => u.name" v-slot="{ query, filtered, onKeydown }">
  <input v-model="query" @keydown="onKeydown" />
  <ul><li v-for="u in filtered" :key="u.id">{{ u.name }}</li></ul>
</ComboboxRoot>
```

Выигрыш: одна реализация поведения переиспользуется в разных дизайн-системах, тестируется без DOM и не тянет за собой стили. Цена — больше «сборочного» кода на стороне потребителя, поэтому headless оправдан для библиотек и сложных виджетов, а не для рядовых компонентов продукта.

##### Сложные композиции: динамические деревья и runtime dependency injection

Для рекурсивных структур (дерево категорий, конструктор форм, редактор блоков) конфигурация описывается данными, а сопоставление «тип узла → компонент» делается через реестр. Реестр внедряется через `provide`/`inject` — это и есть runtime DI: разные части приложения могут подставить свои реализации, не меняя код дерева.

```ts
// registry.ts
export const WIDGET_REGISTRY = Symbol('widgets') as InjectionKey<Map<string, Component>>
```

```vue
<!-- FormRenderer.vue -->
<script setup lang="ts">
const registry = inject(WIDGET_REGISTRY)!
const props = defineProps<{ schema: Node[] }>()
const resolve = (type: string) => registry.get(type) ?? FallbackWidget
</script>

<template>
  <template v-for="node in schema" :key="node.id">
    <component :is="resolve(node.type)" v-bind="node.props">
      <!-- рекурсия: узел рендерит собственных потомков -->
      <FormRenderer v-if="node.children" :schema="node.children" />
    </component>
  </template>
</template>
```

Такой подход даёт инверсию зависимостей: `FormRenderer` зависит от абстракции (реестр), а не от конкретных виджетов, поэтому пакет с рендерером не тянет за собой всю библиотеку компонентов, а продуктовые команды регистрируют свои узлы сами.

##### Архитектура данных: собственные контейнеры значений и минимизация перерисовок

В больших приложениях источник лишних рендеров — избыточно реактивные структуры. Инструменты точечного контроля: `shallowRef` (реактивна только замена значения целиком), `markRaw` (полностью вне реактивности), `readonly` (запрет мутаций снаружи) и `customRef` (собственная политика track/trigger).

```ts
// Контейнер с батчингом: множество записей за тик → одно оповещение подписчиков
export function batchedRef<T>(initial: T) {
  let value = initial
  let scheduled = false
  return customRef<T>((track, trigger) => ({
    get() { track(); return value },
    set(next) {
      value = next
      if (scheduled) return
      scheduled = true
      queueMicrotask(() => { scheduled = false; trigger() })
    },
  }))
}

// Большая таблица: реактивна только ссылка на массив, не каждая ячейка
const rows = shallowRef<Row[]>([])
const applyPatch = (patch: Row[]) => { rows.value = merge(rows.value, patch) } // замена ссылки

// Внешние инстансы (карты, чарты, редакторы) — вне реактивности
const editor = markRaw(new MonacoEditor())

// Наружу store отдаёт неизменяемое представление
const state = reactive({ items: [] })
export const publicState = readonly(state)
```

Правило выбора: `ref`/`reactive` — по умолчанию; `shallowRef` — когда данные меняются целиком и они большие; `markRaw` — для чужих объектов с собственным жизненным циклом; `customRef` — когда нужна нестандартная политика оповещения (дебаунс, батчинг, синхронизация с внешним источником).

##### Миграция проекта с Vue 2 на Vue 3

Порядок работ, снижающий риск: сначала подготовка на Vue 2.7 (он даёт Composition API и `<script setup>`), затем перевод на Vue 3 через `@vue/compat`, и только потом — точечное снятие legacy-режимов.

Что ломается чаще всего:

| Область | Vue 2 | Vue 3 |
|---|---|---|
| Создание приложения | `new Vue({...})`, глобальные `Vue.use/mixin` | `createApp()`, конфигурация на инстансе приложения |
| Реактивность | `Object.defineProperty`, нужен `Vue.set`/`Vue.delete` | `Proxy`, добавление ключей работает само |
| Фильтры | поддерживаются | удалены — заменяются `computed`/методами |
| События вне дерева | `$on`/`$off` на инстансе (event bus) | удалены — Pinia, provide/inject или внешний эмиттер |
| v-model | `value` + `input`, `.sync` | `modelValue` + `update:modelValue`, несколько v-model |
| Слоты | `slot-scope`, `$scopedSlots` | единый `v-slot`, `$slots` |
| Корневой узел | строго один | фрагменты разрешены (влияет на fallthrough-атрибуты и стили) |

```js
// vue.config.js — промежуточный режим совместимости
module.exports = {
  chainWebpack: (config) => {
    config.resolve.alias.set('vue', '@vue/compat')
    config.module.rule('vue').use('vue-loader').tap((options) => ({
      ...options,
      compilerOptions: { compatConfig: { MODE: 2 } }, // включаем legacy-поведение целиком
    }))
  },
}
```

Дальше compat-режим выключается по одной опции за раз (`MODE: 3` плюс точечные исключения), а сборка и тесты показывают оставшиеся места. Отдельного внимания требуют зависимости: библиотеки без Vue 3-версий (старые UI-киты, `vue-i18n@8`, `vuex@3`) нужно заменить или форкнуть — обычно это и есть основная стоимость миграции, а не сам код приложения.

##### Реализация собственного стейт-менеджера средствами Vue Core

Понимание, что Pinia — это тонкая обёртка над реактивностью Vue, полезно и на собеседовании, и при написании собственных инфраструктурных решений. Минимальный store — это `reactive`-состояние в модуле плюс `readonly`-доступ наружу и функции-мутаторы.

```ts
// store.ts — «Pinia в 20 строк»
import { reactive, readonly, computed } from 'vue'

export function defineSimpleStore<T>(setup: () => T) {
  let instance: T | null = null
  return function useStore(): T {
    if (!instance) instance = setup()   // синглтон на приложение
    return instance
  }
}

export const useCounter = defineSimpleStore(() => {
  const state = reactive({ count: 0 })
  const double = computed(() => state.count * 2)
  const inc = () => state.count++
  return { state: readonly(state), double, inc }
})
```

Чего не хватает такому решению по сравнению с Pinia — и что показывает, за что платят библиотекой: изоляции инстанса на SSR-запрос (иначе состояние утечёт между пользователями), devtools-интеграции, HMR, системы плагинов и типизации `$patch`/`$subscribe`.

##### Проектирование масштабируемых библиотек компонентов

Библиотека компонентов — продукт с собственным API-контрактом и обратной совместимостью. Ключевые решения принимаются один раз и стоят дорого при пересмотре:

- **Слои компонентов.** Примитивы (`Button`, `Input`) → составные (`Select`, `DatePicker`) → доменные (`UserPicker`). Доменные могут зависеть от примитивов, обратная зависимость запрещена.
- **Стилизация.** Тема через CSS-переменные (а не через props), точки кастомизации — `::part`/классы-хуки; жёстко зашитые цвета делают библиотеку непригодной для второго продукта.
- **Расширяемость вместо разрастания API.** Слоты и headless-варианты вместо десятков булевых props: `showIcon`, `showClear`, `showCounter` — путь к неподдерживаемому компоненту.
- **Сборка и типы.** ESM + типы `.d.ts`, `sideEffects: false` и точечные экспорты, чтобы tree shaking убирал неиспользованное; peer-зависимость на `vue`, а не прямая.
- **Контракт и версии.** Semver, changeset-ы на каждый PR, визуальные snapshot-тесты и стенд (Storybook/Histoire) как живая документация.

```json
// package.json библиотеки — точечные экспорты и корректный tree shaking
{
  "type": "module",
  "sideEffects": ["*.css"],
  "peerDependencies": { "vue": "^3.4.0" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./styles.css": "./dist/styles.css"
  }
}
```

#### Механизмы

##### Отличительные особенности разных фреймворков на уровне работы ядра (например, Vue vs React или Angular): реактивность, планировщик, сборщик мусора, компиляция.
Vue использует автоматическую реактивность на основе Proxy с точечным перерисовыванием зависимых компонентов; React — модель ре-рендера "сверху вниз" по сигналу `setState` с ручной мемоизацией через `useMemo`/`useCallback`; Angular — zone.js-based change detection (либо сигналы в новых версиях) с обходом всего дерева компонентов. Vue дополнительно компилирует шаблоны в оптимизированный render-код (AOT), тогда как чистые render-based подходы (React) такой compiler-оптимизации не имеют.

##### Алгоритм работы с Virtual DOM внутри Vue
При каждом обновлении Vue вызывает render-функцию компонента, получает новое VNode-дерево и сравнивает его со старым (diff/patch), применяя к реальному DOM только необходимые изменения — вставку, удаление, обновление атрибутов конкретных узлов.

##### Алгорим сравнения VNode во Vue, и как key влияет на сравнение нод
Vue сравнивает узлы одного уровня по типу и (для списков) по `key`: при совпадении `key` узел переиспользуется и патчится, а не пересоздаётся; без `key` (или при индексном key) Vue сопоставляет узлы позиционно, что может приводить к неверному переиспользованию state DOM-элементов при перестановке списка.

##### Пределы runtime-реактивности во Vue. Почему Vue использует комбинированный подход (Runtime-реактивность + Compiler-оптимизации) для высокой производительности, а не чистую runtime-реактивность (как MobX или Knockout)
Чистая runtime-реактивность не знает заранее структуру шаблона и вынуждена отслеживать зависимости и диффать полное дерево на каждое изменение. Vue дополнительно компилирует шаблон на этапе сборки, размечая статичные и динамические части (patch flags), что позволяет пропускать сравнение заведомо неизменных узлов и обновлять только реально динамические — это недостижимо при чистом runtime-подходе.

##### Как Vue оптимизирует шаблоны в процессе AOT-компиляции, если использовать template. И какие оптимизации уничтожает прямое использование JSX и render-функций
Компилятор шаблонов расставляет patch flags (какие атрибуты/текст динамические), выносит статичные поддеревья в hoisted-константы (создаются один раз) и группирует статичные узлы для пропуска при diff. При ручных render-функциях/JSX эти оптимизации по умолчанию недоступны — разработчик сам отвечает за то, чтобы не создавать лишние VNode на каждый рендер.

##### Перформанс-аудит крупного проекта и системная оптимизация

Аудит идёт сверху вниз — от пользовательских метрик к конкретному коду, а не наоборот:

1. **Полевые данные.** RUM-метрики (LCP, INP, CLS) по реальным пользователям: какие страницы и какие устройства страдают.
2. **Лабораторный прогон.** Lighthouse и трейс в Performance с CPU throttling — воспроизвести проблему на медленном железе.
3. **Сеть и бандл.** Размер и число чанков на первый экран, дубли зависимостей, блокирующие ресурсы, отсутствие сжатия/кеш-заголовков.
4. **Рендеринг.** Vue Devtools Performance — компоненты с аномальным числом или временем рендера.
5. **Реактивность.** Источники лишних обновлений: подписка на весь store, нестабильные `key`, глубоко реактивные большие структуры.
6. **Runtime-нагрузка.** Long tasks: тяжёлые вычисления в main thread, необученные обработчики скролла/ресайза без throttle и `passive`.

Типовые системные лечения по итогам: маршрутный code splitting и предзагрузка следующего вероятного маршрута, виртуализация длинных списков, `shallowRef`/`markRaw` для больших структур, вынос расчётов в Web Worker, замена тяжёлых зависимостей (moment → date-fns/Intl), серверная пагинация.

```ts
// Виртуализация: в DOM живут только видимые строки — главный приём для списков 10k+
const { list, containerProps, wrapperProps } = useVirtualList(rows, { itemHeight: 48 })
```

##### Работа с метриками WebVitals и точечная оптимизация узких мест

Метрики измеряются на проде, а не «на глаз»: LCP — время появления главного контента, INP — отзывчивость на взаимодействия, CLS — визуальная стабильность.

```ts
// main.ts — отправка реальных метрик в аналитику
import { onLCP, onINP, onCLS } from 'web-vitals'
const send = (m: Metric) =>
  navigator.sendBeacon('/rum', JSON.stringify({ name: m.name, value: m.value, path: location.pathname }))
onLCP(send); onINP(send); onCLS(send)
```

Что чинит каждую метрику:

| Метрика | Типичная причина | Лечение |
|---|---|---|
| LCP | тяжёлый бандл, поздняя загрузка героя-картинки, ожидание API | SSR/предрендер, `fetchpriority="high"`, preload шрифтов, серверный кеш |
| INP | долгие задачи в main thread, синхронные эффекты, огромные списки | разбиение задач, Web Worker, виртуализация, `flush: 'post'` вместо `sync` |
| CLS | картинки без размеров, поздняя подгрузка шрифтов, вставка баннеров | `width`/`height` и `aspect-ratio`, `font-display: optional`, резерв места под динамические блоки |

##### Кастомные runtime-компоненты и собственные renderer'ы

Vue отделяет реактивность и алгоритм согласования (`@vue/runtime-core`) от платформенных операций с узлами (`@vue/runtime-dom`). Благодаря этому `createRenderer` позволяет отрисовывать дерево компонентов не в DOM, а куда угодно — в canvas, WebGL-сцену, терминал или тестовый снимок.

```ts
import { createRenderer } from '@vue/runtime-core'

const { createApp } = createRenderer<CanvasNode, CanvasNode>({
  createElement: (type) => new CanvasNode(type),
  insert: (child, parent, anchor) => parent.insertChild(child, anchor),
  remove: (child) => child.parent?.removeChild(child),
  patchProp: (el, key, prev, next) => el.setProp(key, next),
  setElementText: (el, text) => { el.text = text },
  createText: (text) => new CanvasNode('text', text),
  parentNode: (node) => node.parent,
  nextSibling: (node) => node.next,
})

createApp(Scene).mount(rootCanvasNode) // тот же Vue-компонентный код, другая платформа
```

Внутри обычного DOM-приложения тот же приём в миниатюре — функциональные runtime-компоненты, создаваемые на лету через `h()`: рендер-обёртки, провайдеры, компоненты-декораторы, которым не нужен собственный SFC.

#### Компоненты экосистемы

##### Несколько подходов для роутинга (Vue Router, Tanstack Router) и понимает их особенности при встраивании в ландшафт
Vue Router — официальное решение, глубоко интегрированное с экосистемой Vue (guards, lazy routes, `<RouterView>`). Tanstack Router — фреймворк-агностичный роутер с сильной типобезопасностью параметров маршрута и встроенной интеграцией с кэшированием данных (loader'ы), что удобно при совместном использовании с Tanstack Query.

##### Где система работы с кешами (Tanstack Query) дает более декларативную модель работы с данными, чем классическое использование стейт-менеджеров
Tanstack Query декларативно описывает серверное состояние (кэш, повторные запросы, инвалидация, фоновое обновление) через ключи запроса, избавляя от ручного написания actions/watch для загрузки, лоадеров и синхронизации свежести данных, что обычно приходится писать вручную в Pinia/Vuex.

##### State-архитектура доменных областей и миграция Vuex → Pinia

В большом приложении состояние делится по доменам, а не по экранам: у каждого домена свой store, свои типы и свой API-слой. Экранам достаётся только UI-состояние. Это правило удерживает связность: страница может исчезнуть, домен — нет.

Слои, которые стоит разделять явно:

- **Серверное состояние** — данные с бекенда (кеш, инвалидация, повторные запросы). Часто уместнее TanStack Query, чем store.
- **Доменное состояние** — корзина, сессия, права, настройки: живёт в Pinia.
- **UI-состояние** — открытые модалки, табы, скролл: локальные `ref` в компонентах.

Миграция Vuex → Pinia делается модуль за модулем, оба стейт-менеджера какое-то время сосуществуют:

```js
// Было: namespaced-модуль Vuex
export default {
  namespaced: true,
  state: () => ({ items: [] }),
  getters: { total: (s) => s.items.length },
  mutations: { SET(state, items) { state.items = items } },
  actions: {
    async load({ commit }) { commit('SET', await api.getItems()) },
  },
}
```

```ts
// Стало: store Pinia — мутации не нужны, state меняется прямо в action
export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([])
  const total = computed(() => items.value.length)
  async function load() { items.value = await api.getItems() }
  return { items, total, load }
})
```

Порядок: перевести модуль → заменить `mapState`/`dispatch` в компонентах на `useItemsStore()` → удалить модуль из Vuex → повторить. На время перехода общие данные держат в одном месте (обычно уже в Pinia), а во Vuex оставляют проксирующий геттер, чтобы не было двух источников правды.

##### Store Persistence и вспомогательные core-плагины

Персистентность — это не просто «сохранить весь store». Осознанные решения: что сохраняем (белый список полей), куда (localStorage / IndexedDB), как версионируем и что делаем при несовместимости.

```ts
// plugins/persist.ts — с версией схемы и выборочными полями
export function persist({ store, options }: PiniaPluginContext) {
  const cfg = options.persist
  if (!cfg) return

  const key = `${store.$id}:v${cfg.version}`
  const saved = localStorage.getItem(key)
  if (saved) store.$patch(JSON.parse(saved))
  else Object.keys(localStorage)
    .filter((k) => k.startsWith(`${store.$id}:v`))
    .forEach((k) => localStorage.removeItem(k))   // чистим устаревшие версии схемы

  store.$subscribe((_m, state) => {
    const slice = Object.fromEntries(cfg.paths.map((p) => [p, state[p]]))
    localStorage.setItem(key, JSON.stringify(slice))
  })
}
```

Другие полезные core-плагины того же вида: логирование действий (в dev — в консоль, в prod — в Sentry как breadcrumbs), синхронизация тяжёлых данных с IndexedDB, синхронизация состояния между вкладками через `BroadcastChannel`, метрики времени выполнения actions.

```ts
// Плагин-логгер: оборачивает каждый action
pinia.use(({ store }) => {
  store.$onAction(({ name, onError, after }) => {
    const start = performance.now()
    after(() => metrics.timing(`store.${store.$id}.${name}`, performance.now() - start))
    onError((e) => Sentry.captureException(e, { tags: { store: store.$id, action: name } }))
  })
})
```

##### Оптимизация роутинга и стратегия code splitting в больших SPA/MPA

Граница чанка по умолчанию — маршрут. Дальше стратегия строится вокруг трёх вопросов: что нужно на первом экране, что можно предзагрузить заранее и что должно грузиться только по требованию.

```js
const routes = [
  {
    path: '/reports',
    // magic comments Vite/Rollup: имя чанка и предзагрузка при простое
    component: () => import(/* webpackPrefetch: true */ '@/pages/Reports.vue'),
  },
]

// Предзагрузка вероятного следующего маршрута по наведению на ссылку
function prefetchRoute(name) {
  const record = router.resolve({ name }).matched[0]
  const loader = record?.components?.default
  if (typeof loader === 'function') loader()   // просто вызываем импорт заранее
}
```

Приёмы уровня приложения: общий вендорный чанк для стабильных зависимостей (долгий кеш), отдельные чанки для тяжёлых редко используемых модулей (редактор, чарты, PDF), ленивая регистрация store и i18n-словарей вместе с маршрутом, а для MPA — разделение по точкам входа, чтобы админка не тянула код витрины.

##### Внедрение ESLint-правил и собственных плагинов для Vue

Базис — `eslint-plugin-vue` (пресеты `flat/recommended`) плюс `vue-tsc` для типов в шаблонах. Ценность на senior-уровне даёт не включение пресета, а перевод командных договорённостей в автоматические проверки: архитектурные границы, запрещённые импорты, обязательные соглашения об именовании.

```js
// eslint.config.js
import pluginVue from 'eslint-plugin-vue'
import boundaries from 'eslint-plugin-boundaries'

export default [
  ...pluginVue.configs['flat/recommended'],
  {
    plugins: { boundaries },
    rules: {
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/no-undef-components': 'error',
      'vue/require-explicit-emits': 'error',
      // архитектурная граница: слой shared не имеет права знать о features
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [{ from: 'features', allow: ['shared', 'entities'] }],
      }],
    },
  },
]
```

Собственное правило пишется, когда проверка специфична для проекта — например, запрет обращаться к store напрямую из презентационных компонентов:

```js
// rules/no-store-in-ui.js
export default {
  meta: { type: 'problem', messages: { forbidden: 'UI-компонент не должен использовать store' } },
  create(context) {
    if (!context.filename.includes('/ui/')) return {}
    return {
      CallExpression(node) {
        if (node.callee.name?.startsWith('use') && node.callee.name.endsWith('Store')) {
          context.report({ node, messageId: 'forbidden' })
        }
      },
    }
  },
}
```

#### Инструменты

##### Особенности интеграции Vue в микрофронтенд-архитектуру
Vue-приложение может встраиваться как отдельный Web Component через `defineCustomElement`, что изолирует его от остального стека хоста; при этом нужно отдельно продумывать шаринг общего состояния/аутентификации между независимо задеплоенными микрофронтендами.

```js
// экспорт Vue-приложения как Web Component для встраивания в чужой стек
import { defineCustomElement } from 'vue'
customElements.define('my-widget', defineCustomElement(MyWidget))
```

##### Snapshot-тесты и кодогенерация контрактов компонентов

Snapshot фиксирует отрендеренный результат и ловит непреднамеренные изменения разметки. Полезен для библиотеки компонентов, вреден как основной вид тестов продукта: большие снимки никто не читает и их обновляют не глядя.

```ts
it('рендерит все варианты кнопки', () => {
  for (const variant of ['primary', 'ghost', 'danger'] as const) {
    const wrapper = mount(BaseButton, { props: { variant }, slots: { default: 'Ок' } })
    expect(wrapper.html()).toMatchSnapshot(variant)   // маленькие, именованные снимки
  }
})
```

Кодогенерация контрактов автоматизирует то, что иначе расходится с кодом: типы props/emits компонентов и типы API. Генерация запускается в CI, и расхождение падает как ошибка сборки, а не всплывает на проде.

```bash
vue-component-meta   # извлекает props/emits/slots из SFC → JSON для доков и типов
openapi-typescript openapi.json -o src/api/schema.d.ts   # типы бекенд-контракта
```

##### Мониторинг производительности в продакшене

Локальные замеры не показывают, как приложение живёт у пользователей. Прод-мониторинг строится из трёх источников: RUM-метрики (WebVitals), ошибки и трассировки (Sentry), собственные бизнес-таймеры (`performance.mark/measure`).

```ts
// Собственная метрика: сколько живёт критичный сценарий целиком
performance.mark('checkout:start')
await submitOrder()
performance.mark('checkout:end')
const { duration } = performance.measure('checkout', 'checkout:start', 'checkout:end')
metrics.timing('checkout.duration', duration)
```

```ts
// Sentry с трассировкой и роутером — привязка ошибок и медленных транзакций к маршруту
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration({ router })],
  tracesSampleRate: 0.1,          // семплирование, чтобы не платить за 100% трафика
  release: import.meta.env.VITE_RELEASE,
})
```

Дальше метрики закрепляются в бюджете производительности: размер бандла на маршрут и пороги LCP/INP проверяются в CI, а регресс блокирует релиз — иначе оптимизация откатывается сама собой за пару спринтов.

##### Встраивание Vue-приложения в микрофронтенд-ландшафт

Vue-приложение в микрофронтенде — это не отдельная вкладка, а модуль, живущий рядом с чужим кодом. Три вопроса решаются на старте: как отдаётся код, как изолируется рантайм и как шарится состояние.

```js
// vite.config.js — экспорт микрофронта через Module Federation
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: { './mount': './src/mount.ts' },
      shared: { vue: { requiredVersion: '^3.4.0', singleton: true } }, // один инстанс Vue на страницу
    }),
  ],
})
```

```ts
// mount.ts — контракт хоста: примонтировать и корректно размонтировать
export function mount(el: HTMLElement, ctx: { token: string; onEvent: (e: AppEvent) => void }) {
  const app = createApp(Root)
  app.provide(HOST_CONTEXT, ctx)   // зависимости приходят от хоста, а не из глобалов
  app.mount(el)
  return () => app.unmount()       // хост обязан уметь выгрузить микрофронт
}
```

Практические ограничения, которые нужно держать в голове: два инстанса Vue на странице ломают `provide/inject` и devtools (поэтому `singleton: true`), глобальные стили и `body`-`Teleport` протекают между приложениями (нужны префиксы и контейнеры), общее состояние безопаснее передавать событиями и явным контекстом, чем общим store, а версии Vue у хоста и ремоутов должны быть совместимы — это фиксируется контрактом, а не устной договорённостью.

#### Internals / Непубличное API

##### Слабо-документированные или неочевидные возможности фреймворка, способен предсказывать ошибки глядя на код до запуска
Например, знание, что `v-if` на одном элементе с `v-for` пересчитывает условие на каждой итерации (Vue 3, приоритет `v-if`), или что мутация `props` вызовет предупреждение в dev-режиме, но молча "сработает" в проде — такие нюансы позволяют увидеть баг по одному чтению кода, без запуска.

##### Свободно читать исходники @vue/runtime-core и @vue/compiler-core и объяснить что происходит в коде
Например, понимание, как `createRenderer` абстрагирует платформенные операции (`createElement`, `patchProp`, `insert`) от общей логики diff/patch, что и позволяет переиспользовать один и тот же алгоритм для DOM, canvas или кастомных рендереров.

```js
import { createRenderer } from '@vue/runtime-core'
const { createApp } = createRenderer({
  createElement: (type) => customPlatformCreate(type),
  patchProp: (el, key, prev, next) => customPlatformPatch(el, key, next),
  insert: (el, parent) => customPlatformInsert(el, parent),
})
```

##### Оценка рисков: внутренний API против публичного Feature Request

Использование внутреннего API — управляемый технический долг, а не запрет. Решение принимается по трём критериям: есть ли публичная альтернатива, какова цена поломки при обновлении Vue и сколько ждать официального решения.

| Ситуация | Разумный выбор |
|---|---|
| Публичное API решает задачу с небольшим оверхедом | Публичное API, даже если внутреннее «красивее» |
| Нужна разовая интеграция с devtools/тестами | Внутреннее API, изолированное в одном модуле |
| Задача общая для многих проектов | Feature Request / RFC в upstream, временный обходной путь у себя |
| Внутреннее API нужно в горячем пути продукта | Отказаться: цена breaking change выше выигрыша |

Правила безопасного применения, если решение принято: доступ к внутреннему API только через один адаптер-модуль, зафиксированная точная версия `vue` в зависимостях, тест, который падает при изменении поведения, фолбэк на публичный путь и комментарий с причиной и ссылкой на upstream-issue.

```ts
// internal/instance-adapter.ts — единственная точка соприкосновения с internals
import { getCurrentInstance } from 'vue'

/**
 * Нужен доступ к uid инстанса для сопоставления с трассировкой Sentry.
 * Публичного API нет: https://github.com/vuejs/core/issues/XXXX
 * При обновлении Vue проверяет тест internal-adapter.spec.ts.
 */
export function getInstanceId(): string {
  const instance = getCurrentInstance() as { uid?: number } | null
  return instance?.uid != null ? String(instance.uid) : crypto.randomUUID() // фолбэк
}
```

##### Код, использующий особенности внутренней реализации Vue

Знание внутренностей окупается не хаками, а тем, что обычный код пишется «по шерсти» компилятора и рантайма:

- Статическая разметка в `template` поднимается компилятором в константы (hoisting) и не участвует в сравнении — тот же фрагмент в render-функции пересоздаётся каждый рендер.
- Patch flags помечают, какие именно привязки динамические; `v-bind="obj"` со всем объектом лишает компилятор этой информации и переводит узел в полное сравнение props.
- `computed` ленив и кеширован: значение пересчитывается только при чтении после инвалидации, поэтому дорогие выражения лучше держать в `computed`, а не в `watch` с записью в `ref`.
- Эффекты собираются в очередь и выполняются пачкой в микротаске — несколько записей в реактивные значения подряд дают один рендер, ручной `nextTick` между ними только замедляет.
- Стабильные `key` позволяют алгоритму сравнения переиспользовать узлы; индекс массива в качестве `key` при вставке в начало приводит к перерисовке всего списка.

```vue
<!-- Компилятор пометит динамическим только текст, класс останется статикой -->
<div class="row"><span>{{ title }}</span></div>

<!-- Здесь оптимизация теряется: состав props неизвестен на этапе компиляции -->
<div v-bind="rowAttrs"><span>{{ title }}</span></div>
```

#### SSR и гидрация

##### Для чего нужны серверные компоненты
Серверные компоненты рендерятся и выполняются исключительно на сервере, не попадая в клиентский бандл и не требуя гидратации — снижают вес JS, отправляемого в браузер, для частей UI, не нуждающихся в интерактивности.

##### Data prefetching и skeleton-loading стратегия

Цель — чтобы пользователь увидел осмысленный экран как можно раньше, а данные догружались без «прыжков» верстки. Разделяются критичные данные (нужны для первого экрана, грузятся на сервере) и второстепенные (грузятся после гидрации).

```vue
<script setup lang="ts">
// критично для LCP: рендерится на сервере, попадает в payload
const { data: product } = await useFetch(`/api/products/${route.params.id}`)

// второстепенно: не блокирует серверный рендер
const { data: reviews, pending } = useLazyFetch(`/api/products/${route.params.id}/reviews`)
</script>

<template>
  <ProductHeader :product="product" />
  <!-- скелет занимает ровно то же место, что и контент → CLS не растёт -->
  <ReviewsSkeleton v-if="pending" :rows="3" />
  <ReviewsList v-else :reviews="reviews" />
</template>
```

Дополняющие приёмы: предзагрузка данных следующего вероятного маршрута по наведению, кеш ответов с TTL на сервере, дедупликация одинаковых запросов по ключу и параллельный (а не последовательный) запуск независимых запросов.

##### Оптимизация гидрации: ленивая, частичная и потоковая

Гидрация — самый дорогой этап SSR: браузер повторно проходит всё дерево и навешивает обработчики. Оптимизация сводится к тому, чтобы гидрировать меньше и позже.

- **Ленивая гидрация** — компонент оживает при появлении в вьюпорте, при взаимодействии или в idle. Во Vue 3.5+ для этого есть готовые стратегии асинхронных компонентов.
- **Частичная гидрация (islands)** — статические участки остаются HTML навсегда, интерактивны только «острова». В Nuxt это серверные компоненты и `<NuxtIsland>`.
- **Потоковый рендер** — сервер отдаёт HTML по частям (`renderToWebStream`), браузер начинает показывать страницу до готовности всех данных.

```ts
// Ленивая гидрация: код и оживление откладываются до появления в вьюпорте
const Comments = defineAsyncComponent({
  loader: () => import('./Comments.vue'),
  hydrate: hydrateOnVisible(),
})
```

Частая ошибка — рассинхронизация серверной и клиентской разметки (случайные значения, `Date.now()`, обращение к `localStorage` в рендере): Vue сообщает о hydration mismatch и перерисовывает поддерево целиком, съедая весь выигрыш SSR.

##### Edge rendering и стратегии кеширования ответа

Edge-рендеринг выполняет SSR на узлах CDN близко к пользователю: меньше сетевая задержка до сервера, но ограничен рантайм (нет полноценного Node API) и время выполнения. Ключевое решение — какой режим применяется к какому маршруту.

```ts
// nuxt.config.ts — режим рендеринга задаётся на уровне маршрутов
export default defineNuxtConfig({
  nitro: { preset: 'cloudflare-pages' },
  routeRules: {
    '/': { prerender: true },                                  // статика на сборке
    '/catalog/**': { swr: 600 },                               // кеш на 10 минут + фоновая ревалидация
    '/product/**': { isr: 3600 },                              // инкрементальная регенерация
    '/account/**': { ssr: true, headers: { 'cache-control': 'private, no-store' } },
    '/admin/**': { ssr: false },                               // чистый SPA
  },
})
```

Правило разделения: кешируемым может быть только ответ, не зависящий от пользователя. Персонализированные фрагменты (корзина, имя, права) выносятся в клиентский запрос после гидрации либо помечаются как приватные — иначе один пользователь увидит закешированные данные другого.

##### Собственные SSR-pipelines и интеграция с существующим бекендом

Когда готовый мета-фреймворк не подходит (рендер должен жить внутри Nest/Express-приложения, нужна своя схема авторизации или нестандартный транспорт), SSR собирается вручную из `vue/server-renderer`. Ключевое требование — на каждый запрос создаётся свежее приложение, store и роутер: общий инстанс приведёт к утечке данных между пользователями.

```ts
// entry-server.ts
import { createSSRApp } from 'vue'
import { renderToWebStream } from 'vue/server-renderer'

export async function render(url: string, manifest: Manifest) {
  const { app, router, pinia } = createApp()   // новый инстанс на каждый запрос
  await router.push(url)
  await router.isReady()

  const stream = renderToWebStream(app)        // потоковая отдача вместо строки
  const state = JSON.stringify(pinia.state.value).replace(/</g, '\\u003c') // защита от XSS в payload
  return { stream, state, preloadLinks: renderPreloadLinks(manifest) }
}
```

```ts
// Интеграция в Nest/Express: SSR — это обычный обработчик маршрута
app.get('*', async (req, res) => {
  const { stream, state } = await render(req.originalUrl, manifest)
  res.setHeader('Content-Type', 'text/html')
  res.write(templateHead + `<script>window.__PINIA__=${state}</script><div id="app">`)
  await stream.pipeTo(new WritableStream({ write: (chunk) => res.write(chunk) }))
  res.end('</div>' + templateTail)
})
```

Что придётся реализовать самостоятельно и что обычно недооценивают: манифест ассетов и preload-ссылки для чанков текущего маршрута, обработку редиректов и 404 из роутера, таймаут и фолбэк на CSR при ошибке рендера, кеш ответов и корректную передачу заголовков/куки в серверные запросы.