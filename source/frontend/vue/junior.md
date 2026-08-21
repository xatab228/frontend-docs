# Vue — Junior

## Vue Core

### Концепцию SFC (Single File Components) и структуру стандартного .vue файла (template, script, style)
SFC — файл `.vue`, объединяющий разметку (`template`), логику (`script`) и стили (`style`) компонента в одном месте. Компилятор Vue разбирает такой файл на отдельные блоки и собирает из них рабочий компонент.

```vue
<template>
  <button @click="count++">{{ count }}</button>
</template>
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
<style scoped>
button { color: red; }
</style>
```

### Синтаксис `<script setup>`, и как он работает
`<script setup>` — компиляционный сахар для Composition API: всё объявленное на верхнем уровне (переменные, функции, импорты) автоматически доступно в шаблоне без явного `return`. Компилятор сам генерирует render-функцию и экспортирует нужные привязки.

### Правила именования компонентов, props и emits.
Имена компонентов — PascalCase (в файле) и multi-word (`UserCard`, а не `Card`), чтобы не конфликтовать с нативными HTML-тегами. Props и emits — camelCase в JS, kebab-case при использовании в шаблоне (`:model-value`, `@update:model-value`).

### Концепцию однонаправленного потока данных (props → child, emit → parent).
Данные идут от родителя к потомку через props только "вниз"; потомок не должен мутировать props напрямую, а сообщает об изменениях наверх через `emit`. Это делает поток данных предсказуемым и облегчает отладку.

```vue
<!-- Child.vue -->
<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
```

### Способы создания компонентов через Composition API и Options API а также о возможностях, которые открывает композиционная модель
Options API группирует код по опциям (`data`, `methods`, `computed`), Composition API — по логическим блокам функциональности через `setup`/`<script setup>`. Composition API позволяет выносить и переиспользовать логику через composable-функции, что сложнее сделать в Options API без миксинов.

```js
// useCounter.js
import { ref } from 'vue'
export function useCounter(initial = 0) {
  const count = ref(initial)
  const inc = () => count.value++
  return { count, inc }
}
```

### Жизненный цикл компонентов (Composition API и зеркальные пары в Options API)
Компонент проходит стадии создания, монтирования, обновления и размонтирования. В Composition API это хуки `onMounted`, `onUpdated`, `onUnmounted` и др., в Options API — методы `mounted`, `updated`, `unmounted`.

```vue
<script setup>
import { ref, onMounted } from 'vue'
const users = ref([])
onMounted(async () => {
  users.value = await fetch('/api/users').then(r => r.json())
})
</script>
```

### Базовые хуки Composition API: ref, reactive, computed, watch.
`ref` оборачивает примитив (или любое значение) в реактивный объект с доступом через `.value`, `reactive` делает реактивным объект целиком. `computed` — кэшируемое производное значение, `watch` — реакция на изменение с побочным эффектом.

```js
const total = computed(() => items.value.reduce((s, i) => s + i.price, 0))
watch(() => filters.value, () => fetchList(), { deep: true })
```

### Директивы для связывания данных и установки событий: v-model, v-bind, v-on.
`v-model` — двустороннее связывание значения (сахар над `:value` + `@input`), `v-bind` (`:`) — одностороннее связывание атрибута/пропа, `v-on` (`@`) — подписка на событие.

```vue
<template>
  <input v-model="form.email" />
</template>
<script setup>
import { reactive } from 'vue'
const form = reactive({ email: '' })
</script>
```

### Условный и списочный рендеринг (v−if, v−for, key)
`v-if`/`v-else-if`/`v-else` управляют наличием элемента в DOM, `v-for` рендерит список по коллекции; `key` обязателен для `v-for` — по нему Vue сопоставляет старые и новые узлы при перерисовке, избегая лишних пересозданий DOM.

```vue
<template>
  <p v-if="status === 'loading'">Загрузка...</p>
  <p v-else-if="status === 'error'">Ошибка</p>
  <p v-else>Готово</p>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</template>
```

### Передача данных через provide/inject
`provide` в компоненте-предке предоставляет значение, `inject` в любом потомке (на любом уровне вложенности) его получает, минуя явную передачу через props на каждом уровне. Это решает проблему props drilling — прокидывания пропа через промежуточные компоненты, которым он не нужен.

```vue
<!-- Предок -->
<script setup>
import { provide, ref } from 'vue'
const theme = ref('dark')
provide('theme', theme) // передаём ref — потомки увидят изменения
</script>
```

```vue
<!-- Потомок любой глубины -->
<script setup>
import { inject } from 'vue'
const theme = inject('theme', 'light') // второй аргумент — значение по умолчанию
</script>
```

### Как работать c дефолтными слотами
Дефолтный `<slot />` — место в шаблоне компонента, куда родитель подставляет произвольный контент между открывающим и закрывающим тегом компонента. Контент внутри `<slot>` служит запасным вариантом и показывается, если родитель ничего не передал.

```vue
<!-- BaseCard.vue -->
<template>
  <div class="card">
    <slot>Нет содержимого</slot>
  </div>
</template>
```

```vue
<!-- Использование -->
<BaseCard>
  <p>Любая разметка родителя попадёт в слот</p>
</BaseCard>
```

### Вывод сырого HTML через v-html и работа с сайд-эффектами

`v-html` вставляет строку как готовую разметку, минуя интерполяцию двойными фигурными скобками (которая всегда экранирует HTML). Использовать его можно только для доверенного контента: вставка пользовательской строки открывает XSS.

Сайд-эффект — любое действие компонента за пределами его собственного состояния: запрос к API, подписка на событие окна, запись в `localStorage`, таймер. У junior-компонентов сайд-эффектов должно быть немного, и все они привязываются к хукам жизненного цикла, а не к телу `setup`.

```vue
<template>
  <article v-html="sanitizedHtml"></article>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DOMPurify from 'dompurify'

const props = defineProps({ rawHtml: String })
// v-html без санитайза = XSS, если контент приходит от пользователя
const sanitizedHtml = ref(DOMPurify.sanitize(props.rawHtml))

const onResize = () => console.log(window.innerWidth)
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize)) // каждый эффект нужно убирать
</script>
```

### Работа с формами: v-model на элементах формы и модификаторы

`v-model` работает не только с `<input type="text">`: на `checkbox` он связывает булево значение (или массив при `value`), на `radio` — выбранное значение, на `<select>` — выбранную опцию. Модификаторы уточняют поведение: `.lazy` синхронизирует по `change` вместо `input`, `.number` приводит значение к числу, `.trim` убирает пробелы по краям.

```vue
<template>
  <form @submit.prevent="submit">
    <input v-model.trim="form.name" placeholder="Имя" />
    <input v-model.number="form.age" type="number" />
    <input v-model="form.subscribed" type="checkbox" />

    <label v-for="tag in allTags" :key="tag">
      <input v-model="form.tags" type="checkbox" :value="tag" /> {{ tag }}
    </label>

    <select v-model="form.city">
      <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
    </select>

    <button :disabled="!form.name">Отправить</button>
  </form>
</template>

<script setup>
import { reactive } from 'vue'
const allTags = ['vue', 'ts']
const cities = ['Москва', 'Казань']
const form = reactive({ name: '', age: 0, subscribed: false, tags: [], city: 'Москва' })
const submit = () => console.log({ ...form })
</script>
```

### Проброс атрибутов от родителя к дочернему элементу (fallthrough attributes)

Атрибуты, переданные компоненту, но не объявленные в `props`/`emits` (`class`, `style`, `id`, `data-*`, обработчики), автоматически применяются к корневому элементу компонента — это и есть fallthrough attributes.

Если корневых элементов несколько или атрибуты должны попасть на внутренний элемент, автоматический проброс отключают через `inheritAttrs: false` и раскладывают `$attrs` вручную.

```vue
<!-- BaseInput.vue -->
<template>
  <label>
    {{ label }}
    <!-- атрибуты родителя (placeholder, type, @focus) уходят на input, а не на label -->
    <input v-bind="$attrs" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
  </label>
</template>

<script setup>
defineOptions({ inheritAttrs: false })
defineProps(['label', 'modelValue'])
defineEmits(['update:modelValue'])
</script>
```

```vue
<!-- Родитель: placeholder и @focus «провалятся» внутрь на input -->
<BaseInput v-model="email" label="Email" placeholder="you@mail.com" @focus="onFocus" />
```

## Механизмы

### Что такое реактивность и какие признаки у реактивной системы
Реактивность — механизм, при котором изменение данных автоматически вызывает обновление всего, что от них зависит (вычисляемые значения, DOM). Признаки: автоматическое отслеживание зависимостей (без ручной подписки) и автоматическое оповещение подписчиков при изменении.

### Имеет общее представление о Virtual DOM
Virtual DOM — облегчённое JS-представление реального DOM-дерева; Vue сравнивает новое и старое виртуальные деревья и применяет к реальному DOM только минимально необходимые изменения, что дешевле прямых манипуляций с DOM.

### Когда использовать ref или reactive
`ref` — универсальный вариант, подходит для примитивов и объектов, легко передаётся между функциями сохраняя реактивность. `reactive` удобен для цельных объектов/структур, но теряет реактивность при деструктуризации и не подходит для примитивов.

### Зачем нужны key и v-once
`key` помогает Vue правильно сопоставлять элементы списка при перерисовке (см. v-for). `v-once` рендерит блок один раз и больше не обновляет его — оптимизация для заведомо статичного контента.

```vue
<template>
  <p v-once>{{ staticLabel }}</p>
</template>
```

### Ленивая загрузка компонентов и точечное кеширование разметки (v-once, v-memo)

Ленивая загрузка (`defineAsyncComponent` или динамический `import()` в маршруте) выносит компонент в отдельный чанк — он скачивается только когда действительно понадобился. Это первый и самый дешёвый способ уменьшить стартовый бандл.

`v-once` рендерит блок один раз и навсегда исключает его из последующих обновлений. `v-memo` — компромисс между ними: блок перерисовывается только если изменилось хотя бы одно значение из переданного массива зависимостей.

```vue
<script setup>
import { defineAsyncComponent } from 'vue'
// тяжёлый компонент попадёт в отдельный чанк и загрузится по требованию
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
</script>

<template>
  <!-- статичная разметка: считается один раз -->
  <footer v-once>© {{ year }} Компания</footer>

  <!-- строка списка перерисуется, только если изменились id или selected -->
  <div v-for="item in items" :key="item.id" v-memo="[item.id, item.selected]">
    {{ item.name }}
  </div>

  <HeavyChart v-if="showChart" />
</template>
```

Правило применения: `v-once` — для заведомо неизменного контента, `v-memo` — только для длинных списков, где профилирование показало реальную проблему. На обычных компонентах `v-memo` чаще вредит, чем помогает: он добавляет проверку зависимостей поверх и без того дешёвого сравнения.

## Компоненты экосистемы

### Зачем нужен стейт-менеджер, и в чем его отличия от локального состояния
Стейт-менеджер (Pinia) хранит состояние, общее для нескольких несвязанных компонентов, вне дерева компонентов — в отличие от локального состояния (`ref`/`reactive` внутри компонента), которое живёт и умирает вместе с компонентом и недоступно снаружи без props/emit.

### API Pinia и Vue Router и на уровне работы с базовыми сценариями (создание/обновление новых store или routes)
```js
export const useCounter = defineStore('counter', () => {
  const count = ref(0)
  const inc = () => count.value++
  return { count, inc }
})
```
```js
const routes = [{ path: '/users/:id', component: () => import('./UserPage.vue') }]
```
```vue
<router-link :to="`/users/${user.id}`">Профиль</router-link>
<router-view />
```

### О существовании Vuex, как альтернативы для Pinia
Vuex — более старый официальный стейт-менеджер Vue с обязательными мутациями и модулями с namespace-строками; Pinia считается его современной заменой с более простым и типобезопасным API.

### О существовании "каноничной" библиотеки @vueuse/core с готовыми composable-хуками
`@vueuse/core` — набор готовых composable-функций (работа с localStorage, событиями, датой и т. д.), покрывающих типовые задачи без написания собственных хуков с нуля.

### Создание store, actions и getters в Pinia

В setup-синтаксисе Pinia роли распределяются так: `ref`/`reactive` — состояние (state), `computed` — getters, обычные функции — actions. Store создаётся один раз и переиспользуется во всех компонентах, где вызван `useXxxStore()`.

```js
// stores/cart.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])                                    // state

  const total = computed(() =>                             // getter
    items.value.reduce((sum, i) => sum + i.price * i.qty, 0)
  )
  const isEmpty = computed(() => items.value.length === 0)

  function add(product) {                                  // action
    const found = items.value.find((i) => i.id === product.id)
    found ? found.qty++ : items.value.push({ ...product, qty: 1 })
  }
  async function loadFromServer() {                        // action может быть async
    items.value = await fetch('/api/cart').then((r) => r.json())
  }

  return { items, total, isEmpty, add, loadFromServer }
})
```

```vue
<script setup>
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()
// деструктуризация store ломает реактивность — для state/getters нужен storeToRefs
const { items, total } = storeToRefs(cart)
// actions деструктурируются напрямую
const { add } = cart
</script>
```

### Создание страниц и навигация: router-view, router-link, динамические параметры

Маршрут связывает путь с компонентом страницы. `<router-view />` — место, куда рендерится текущая страница, `<router-link>` — навигация без перезагрузки. Динамический сегмент (`:id`) доступен через `useRoute().params`.

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },
  { path: '/users/:id', name: 'user', component: () => import('@/pages/UserPage.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('@/pages/NotFound.vue') }, // 404
]

export default createRouter({ history: createWebHistory(), routes })
```

```vue
<!-- UserPage.vue -->
<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()
const user = ref(null)

// параметр меняется без пересоздания компонента — нужен watch, а не только onMounted
watch(() => route.params.id, async (id) => {
  user.value = await fetch(`/api/users/${id}`).then((r) => r.json())
}, { immediate: true })

const goHome = () => router.push({ name: 'home' })
</script>

<template>
  <router-link :to="{ name: 'user', params: { id: 2 } }">Следующий</router-link>
  <button @click="goHome">На главную</button>
</template>
```

### Navigation Guards: beforeEach и beforeEnter

Guard — функция, которая выполняется перед переходом и может его разрешить, отменить или перенаправить. `beforeEach` — глобальный (проверка авторизации для всего приложения), `beforeEnter` — локальный, только для конкретного маршрута.

```js
const routes = [
  {
    path: '/admin',
    component: AdminPage,
    meta: { requiresAuth: true },
    beforeEnter: (to, from) => {
      // локальная проверка: только для этого маршрута
      if (!useUserStore().isAdmin) return { name: 'home' }
    },
  },
]

router.beforeEach((to, from) => {
  const user = useUserStore()
  if (to.meta.requiresAuth && !user.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } } // редирект
  }
  // вернуть false — отменить переход; ничего не вернуть — разрешить
})
```

## Инструменты

### Предназначение инструментов Vite и Vue CLI
Vite — современный инструмент сборки на базе ESM и esbuild/Rollup с быстрым dev-сервером и HMR. Vue CLI — более старый инструмент на базе webpack для создания и сборки проектов, постепенно вытесняется Vite.

### Отличия между Vitest и Jest
Vitest использует ту же конфигурацию и трансформацию, что и Vite (быстрее, нативная поддержка ESM), Jest — более старый и универсальный раннер тестов, требующий отдельной настройки трансформации под Vite/ESM-проекты.

### Базовое API Vitest для написания тест-файлов
```js
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
describe('Counter', () => {
  it('increments', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('1')
  })
})
```
Запуск — `npx vitest`.

### Сборка проекта через Vite и простые изменения конфигурации

Готовый проект собирается двумя командами: `npm run dev` поднимает dev-сервер с HMR, `npm run build` кладёт продакшен-сборку в `dist/`. Конфигурация живёт в `vite.config.js`; типовые правки на junior-уровне — алиасы путей, прокси для API и подключение препроцессора.

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      // поддержка SASS: достаточно поставить npm i -D sass и добавить общий импорт
      scss: { additionalData: `@use "@/styles/variables.scss" as *;` },
    },
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
})
```

### Инициализация нового проекта: create-vue и Vue CLI

Актуальный способ создать проект — `npm create vue@latest`: интерактивный мастер спрашивает про TypeScript, Vue Router, Pinia, Vitest, ESLint и генерирует проект на Vite. Vue CLI (`vue create`) — устаревший генератор на webpack, встречается в старых проектах.

```bash
# современный путь (Vite)
npm create vue@latest my-app
cd my-app && npm install && npm run dev

# legacy-путь (Vue CLI, webpack) — для поддержки старых проектов
npm i -g @vue/cli
vue create my-legacy-app     # интерактивный выбор пресета
vue add typescript           # добавление плагина в существующий проект
```

### Тесты для компонентов и composables: написание и запуск

Компонент монтируется через `@vue/test-utils` и проверяется по отрендеренному результату; composable — обычная функция, её можно вызвать напрямую без монтирования.

```js
// useCounter.spec.js
import { describe, it, expect } from 'vitest'
import { useCounter } from '@/composables/useCounter'

describe('useCounter', () => {
  it('увеличивает счётчик', () => {
    const { count, inc } = useCounter(5)
    inc()
    expect(count.value).toBe(6)
  })
})
```

```js
// CounterButton.spec.js
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CounterButton from '@/components/CounterButton.vue'

describe('CounterButton', () => {
  it('рендерит начальное значение из props', () => {
    const wrapper = mount(CounterButton, { props: { start: 3 } })
    expect(wrapper.text()).toContain('3')
  })

  it('эмитит событие по клику', async () => {
    const wrapper = mount(CounterButton, { props: { start: 0 } })
    await wrapper.find('button').trigger('click') // await — ждём перерисовку
    expect(wrapper.emitted('change')).toBeTruthy()
  })
})
```

```bash
npx vitest          # watch-режим при разработке
npx vitest run      # одиночный прогон (для CI)
npx vitest --coverage
```

## Internals / Непубличное API

### О существовании "внутренних" API
Помимо публичного API, Vue экспортирует ряд внутренних (недокументированных) функций и структур, используемых самим фреймворком и экосистемой (например, для интеграции с devtools), которые не гарантируют стабильность между версиями.

## SSR и гидрация

### Nuxt как способ получить SSR и загрузка данных на сервере

Nuxt — мета-фреймворк над Vue, который из коробки даёт серверный рендеринг, файловый роутинг (`pages/` → маршруты) и единый способ загружать данные так, чтобы запрос выполнялся на сервере, а на клиенте результат переиспользовался, а не запрашивался повторно.

В Nuxt 3 данные грузят через `useAsyncData`/`useFetch` (аналог `asyncData` из Nuxt 2). Ключ запроса нужен, чтобы результат попал в полезную нагрузку страницы и не был запрошен второй раз при гидрации.

```vue
<!-- pages/users/[id].vue — Nuxt 3 -->
<script setup>
const route = useRoute()
// выполняется на сервере при первом заходе, результат передаётся на клиент
const { data: user, pending, error } = await useFetch(`/api/users/${route.params.id}`)
</script>

<template>
  <p v-if="pending">Загрузка...</p>
  <p v-else-if="error">Ошибка загрузки</p>
  <h1 v-else>{{ user.name }}</h1>
</template>
```

```js
// Nuxt 2: тот же смысл через asyncData — то, что чаще всего переписывают при миграции
export default {
  async asyncData({ params, $axios }) {
    const user = await $axios.$get(`/api/users/${params.id}`)
    return { user } // попадает в data компонента
  },
}
```

Главное отличие от привычного CSR-подхода: код `setup` выполняется и на сервере тоже, поэтому обращение к `window`, `document` или `localStorage` на верхнем уровне уронит рендер — такие вызовы переносят в `onMounted` или в блок `if (import.meta.client)`.
