# Vue — Junior


#### Vue Core

##### Концепцию SFC (Single File Components) и структуру стандартного .vue файла (template, script, style)
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

##### Синтаксис `<script setup>`, и как он работает
`<script setup>` — компиляционный сахар для Composition API: всё объявленное на верхнем уровне (переменные, функции, импорты) автоматически доступно в шаблоне без явного `return`. Компилятор сам генерирует render-функцию и экспортирует нужные привязки.

##### Правила именования компонентов, props и emits.
Имена компонентов — PascalCase (в файле) и multi-word (`UserCard`, а не `Card`), чтобы не конфликтовать с нативными HTML-тегами. Props и emits — camelCase в JS, kebab-case при использовании в шаблоне (`:model-value`, `@update:model-value`).

##### Концепцию однонаправленного потока данных (props → child, emit → parent).
Данные идут от родителя к потомку через props только "вниз"; потомок не должен мутировать props напрямую, а сообщает об изменениях наверх через `emit`. Это делает поток данных предсказуемым и облегчает отладку.

```vue
<!-- Child.vue -->
<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
```

##### Способы создания компонентов через Composition API и Options API а также о возможностях, которые открывает композиционная модель
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

##### Жизненный цикл компонентов (Composition API и зеркальные пары в Options API)
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

##### Базовые хуки Composition API: ref, reactive, computed, watch.
`ref` оборачивает примитив (или любое значение) в реактивный объект с доступом через `.value`, `reactive` делает реактивным объект целиком. `computed` — кэшируемое производное значение, `watch` — реакция на изменение с побочным эффектом.

```js
const total = computed(() => items.value.reduce((s, i) => s + i.price, 0))
watch(() => filters.value, () => fetchList(), { deep: true })
```

##### Директивы для связывания данных и установки событий: v-model, v-bind, v-on.
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

##### Условный и списочный рендеринг (v−if, v−for, key)
`v-if`/`v-else-if`/`v-else` управляют наличием элемента в DOM, `v-for` рендерит список по коллекции; `key` обязателен для `v-for` — по нему Vue сопоставляет старые и новые узлы при перерисовке, избегая лишних пересозданий DOM.

```vue
<template>
  <p v-if="status === 'loading'">Загрузка...</p>
  <p v-else-if="status === 'error'">Ошибка</p>
  <p v-else>Готово</p>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</template>
```

##### Передача данных через provide/inject
`provide` в компоненте-предке предоставляет значение, `inject` в любом потомке (на любом уровне вложенности) его получает, минуя явную передачу через props на каждом уровне.

##### Как работать c дефолтными слотами
Дефолтный `<slot />` — место в шаблоне компонента, куда родитель подставляет произвольный контент между открывающим и закрывающим тегом компонента.

#### Механизмы

##### Что такое реактивность и какие признаки у реактивной системы
Реактивность — механизм, при котором изменение данных автоматически вызывает обновление всего, что от них зависит (вычисляемые значения, DOM). Признаки: автоматическое отслеживание зависимостей (без ручной подписки) и автоматическое оповещение подписчиков при изменении.

##### Имеет общее представление о Virtual DOM
Virtual DOM — облегчённое JS-представление реального DOM-дерева; Vue сравнивает новое и старое виртуальные деревья и применяет к реальному DOM только минимально необходимые изменения, что дешевле прямых манипуляций с DOM.

##### Когда использовать ref или reactive
`ref` — универсальный вариант, подходит для примитивов и объектов, легко передаётся между функциями сохраняя реактивность. `reactive` удобен для цельных объектов/структур, но теряет реактивность при деструктуризации и не подходит для примитивов.

##### Зачем нужны key и v-once
`key` помогает Vue правильно сопоставлять элементы списка при перерисовке (см. v-for). `v-once` рендерит блок один раз и больше не обновляет его — оптимизация для заведомо статичного контента.

```vue
<template>
  <p v-once>{{ staticLabel }}</p>
</template>
```

#### Компоненты экосистемы

##### Зачем нужен стейт-менеджер, и в чем его отличия от локального состояния
Стейт-менеджер (Pinia) хранит состояние, общее для нескольких несвязанных компонентов, вне дерева компонентов — в отличие от локального состояния (`ref`/`reactive` внутри компонента), которое живёт и умирает вместе с компонентом и недоступно снаружи без props/emit.

##### API Pinia и Vue Router и на уровне работы с базовыми сценариями (создание/обновление новых store или routes)
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

##### О существовании Vuex, как альтернативы для Pinia
Vuex — более старый официальный стейт-менеджер Vue с обязательными мутациями и модулями с namespace-строками; Pinia считается его современной заменой с более простым и типобезопасным API.

##### О существовании "каноничной" библиотеки @vueuse/core с готовыми composable-хуками
`@vueuse/core` — набор готовых composable-функций (работа с localStorage, событиями, датой и т. д.), покрывающих типовые задачи без написания собственных хуков с нуля.

#### Инструменты

##### Предназначение инструментов Vite и Vue CLI
Vite — современный инструмент сборки на базе ESM и esbuild/Rollup с быстрым dev-сервером и HMR. Vue CLI — более старый инструмент на базе webpack для создания и сборки проектов, постепенно вытесняется Vite.

##### Отличия между Vitest и Jest
Vitest использует ту же конфигурацию и трансформацию, что и Vite (быстрее, нативная поддержка ESM), Jest — более старый и универсальный раннер тестов, требующий отдельной настройки трансформации под Vite/ESM-проекты.

##### Базовое API Vitest для написания тест-файлов
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

#### Internals / Непубличное API

##### О существовании "внутренних" API
Помимо публичного API, Vue экспортирует ряд внутренних (недокументированных) функций и структур, используемых самим фреймворком и экосистемой (например, для интеграции с devtools), которые не гарантируют стабильность между версиями.
