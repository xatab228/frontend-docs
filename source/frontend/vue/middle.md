# Vue — Middle

#### Vue Core

##### Как работать с множественными слотами через именованные слоты
Именованные слоты (`<slot name="header" />`) позволяют компоненту принимать несколько независимых зон контента от родителя, который заполняет их через `<template #header>`.

```vue
<template>
  <Teleport to="body">
    <div class="modal">
      <slot name="header" />
      <component :is="bodyComponent" />
      <slot />
    </div>
  </Teleport>
</template>
```

##### Назначение и отличие Slots от Scoped Slots
Обычный слот передаёт готовую разметку от родителя без доступа к данным потомка. Scoped slot дополнительно прокидывает данные из дочернего компонента наружу через слот-пропсы, позволяя родителю управлять рендерингом с учётом внутреннего состояния потомка.

```vue
<slot :item="item" />
<!-- родитель -->
<template #default="{ item }">...</template>
```

##### Назначение дополнительных компонентов Transition и KeepAlive, доступных из ядра Vue
`Transition` анимирует появление/исчезновение элемента при переключении. `KeepAlive` кэширует состояние и DOM неактивных компонентов при переключении между ними (например, между вкладками), избегая пересоздания.

##### Возможности расширения структуры SFC через другие плагины (например, i18n)
Плагины (например, `vue-i18n`) могут добавлять собственные кастомные блоки в SFC (`<i18n>`), которые обрабатываются на этапе сборки отдельным препроцессором, расширяя стандартную структуру `template/script/style`.

##### Назначение компонентов Fragment и Teleport, доступных прямо из ядра Vue
Fragment позволяет компоненту иметь несколько корневых узлов без обёрточного div. Teleport переносит часть разметки компонента в другое место DOM-дерева (например, `body`) вне визуальной иерархии родителя — удобно для модалок и тултипов.

##### Как работают динамические компоненты (`<component :is="...">`)
`<component :is="...">` рендерит компонент, который определяется динамически — по имени, ссылке на объект компонента или результату вычисления, позволяя переключать разный контент в одном месте шаблона.

```vue
<component :is="bodyComponent" />
```

##### Дополнительные хуки Composition API (readonly, watchEffect) и вспомогательные утилиты из коробки
`readonly` оборачивает реактивный объект в неизменяемую обёртку (защита от мутаций снаружи). `watchEffect` автоматически отслеживает используемые внутри реактивные зависимости и перезапускается при их изменении, без явного указания источника.

```js
watchEffect(() => {
  updateChart(chartRef.value)
}, { flush: 'post' })
```

##### Принципиальное отличие директив v-show и v-if
`v-if` полностью добавляет/удаляет элемент из DOM (с пересозданием при повторном включении), `v-show` всегда рендерит элемент, лишь переключая `display: none`. `v-show` выгоднее при частом переключении, `v-if` — при редком или когда рендеринг дорогой.

##### Несколько вариантов общения между компонентами и обмена состояними (Pinia/Vuex, URL, Provide/Inject, Props Drilling, Cache Sharing)
Состояние можно шарить через стейт-менеджер (Pinia/Vuex) для глобальных данных, через query-параметры URL для состояния, привязанного к странице, через `provide/inject` для дерева компонентов, через прямую передачу props ("prop drilling") на небольшую глубину, либо через общий кэш запросов (например, Tanstack Query).

##### Типичные антипаттерны
Мутация props напрямую вместо emit, тяжёлые вычисления прямо в шаблоне, доступ ко всему `state` вместо точечных геттеров, смешение UI и бизнес-логики в одном компоненте.

```vue
<!-- Child.vue -->
<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
```

##### Официальный Style Guide Vue и необходимость следования ему
Style Guide — набор официальных рекомендаций (multi-word имена компонентов, обязательный `key` в `v-for` и т. д.), обеспечивающих единообразие кода в команде и снижающих число типовых ошибок.

```vue
<template>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</template>
```

##### Как работают scoped стили
`<style scoped>` добавляет каждому элементу шаблона уникальный data-атрибут и переписывает CSS-селекторы под него, изолируя стили компонента от остального приложения без использования Shadow DOM.

##### Проектирование API компонента с типизацией props и emits

API компонента — это его props, emits, слоты и exposed-методы. Типизация фиксирует контракт: IDE подсказывает, а сборка падает при неверном использовании. В `<script setup lang="ts">` для этого есть generic-формы `defineProps`/`defineEmits`.

```vue
<!-- generic="T" объявляет параметр типа для всего компонента -->
<script setup lang="ts" generic="T extends { id: number }">
interface Column<T> { key: keyof T; title: string; width?: number }

const props = withDefaults(defineProps<{
  items: T[]
  columns: Column<T>[]
  loading?: boolean
}>(), { loading: false })

const emit = defineEmits<{
  (e: 'select', row: T): void
  (e: 'update:page', page: number): void
}>()

// то, что компонент осознанно отдаёт наружу через ref на него
defineExpose({ reset: () => emit('update:page', 1) })
</script>
```

Правила проектирования такого API: props — только входные данные (никаких мутаций), события — в прошедшем времени или в форме `update:x` для v-model, необязательные props получают значения по умолчанию, а всё, что нужно родителю императивно, отдаётся через `defineExpose`, а не через обращение к внутренностям компонента.

##### Синхронизация формы, состояния компонента и localStorage

Типовая задача — «не терять черновик формы». Решается связкой `reactive`-состояния, `watch` с `deep: true` для записи и восстановления значения при инициализации. Важно: запись в хранилище — сайд-эффект, его нужно дебаунсить и уметь отключать (например, после успешной отправки).

```ts
// composables/usePersistedForm.ts
import { reactive, watch, onUnmounted } from 'vue'

export function usePersistedForm<T extends object>(key: string, initial: T) {
  const saved = localStorage.getItem(key)
  const form = reactive<T>(saved ? { ...initial, ...JSON.parse(saved) } : { ...initial })

  let timer: ReturnType<typeof setTimeout>
  const stop = watch(form, (value) => {
    clearTimeout(timer)                       // дебаунс: не пишем на каждый символ
    timer = setTimeout(() => localStorage.setItem(key, JSON.stringify(value)), 300)
  }, { deep: true })

  const clear = () => { stop(); localStorage.removeItem(key) }
  onUnmounted(() => clearTimeout(timer))      // чистим таймер вместе с компонентом

  return { form, clear }
}
```

##### Миграция компонента с Options API на Composition API

Перевод делается по механическому соответствию опций: `data` → `ref`/`reactive`, `computed` → `computed`, `methods` → обычные функции, `watch` → `watch`, хуки `mounted`/`beforeDestroy` → `onMounted`/`onUnmounted`, `props`/`emits` → `defineProps`/`defineEmits`. `this` исчезает — обращения идут напрямую к переменным.

```vue
<!-- Было: Options API -->
<script>
export default {
  props: { userId: Number },
  data: () => ({ user: null, loading: false }),
  computed: { displayName() { return this.user?.name ?? 'Гость' } },
  watch: { userId: 'load' },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.user = await fetch(`/api/users/${this.userId}`).then(r => r.json())
      this.loading = false
    },
  },
}
</script>
```

```vue
<!-- Стало: Composition API -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({ userId: Number })
const user = ref(null)
const loading = ref(false)
const displayName = computed(() => user.value?.name ?? 'Гость')

async function load() {
  loading.value = true
  user.value = await fetch(`/api/users/${props.userId}`).then(r => r.json())
  loading.value = false
}

watch(() => props.userId, load)   // источник — геттер, иначе реактивность теряется
onMounted(load)
</script>
```

Порядок безопасной миграции: сначала переносят компонент целиком без изменения логики, потом выносят переиспользуемые куски в composables. Смешивать оба API в одном компоненте допустимо на время миграции, но как постоянное решение это ухудшает читаемость.

##### Переиспользуемые composables: проектирование интерфейса и cleanup-эффекты

Хороший composable принимает параметры (в том числе реактивные, через `ref` или геттер), возвращает плоский объект из `ref`/`computed`/функций и сам убирает за собой все подписки в `onUnmounted`. Правило именования — `useXxx`, вызов только на верхнем уровне `setup`.

```ts
// composables/useFetch.ts
import { ref, watchEffect, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

export function useFetch<T>(url: MaybeRefOrGetter<string>) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  let controller: AbortController | null = null

  const stop = watchEffect(async () => {
    controller?.abort()                 // отменяем предыдущий запрос при смене url
    controller = new AbortController()
    loading.value = true
    try {
      const res = await fetch(toValue(url), { signal: controller.signal })
      data.value = await res.json()
      error.value = null
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error.value = e as Error
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => { stop(); controller?.abort() })  // cleanup: и эффект, и запрос

  return { data, error, loading }
}
```

Composable, который подписывается на события окна, таймеры, `IntersectionObserver` или WebSocket, обязан отписываться — иначе после размонтирования компонента остаётся утечка памяти и «фантомные» обновления состояния.

##### Разделение UI и логики: чистые компоненты без сайд-эффектов

Чистый (презентационный) компонент получает всё через props и сообщает наружу через emit — он не ходит в API, не читает store и не трогает `localStorage`. Сайд-эффекты сосредоточены в контейнерном компоненте или в composable. Такой компонент тривиально тестируется и переиспользуется.

```vue
<!-- UserList.vue — презентационный: только рендер и события -->
<script setup lang="ts">
defineProps<{ users: User[]; loading: boolean }>()
defineEmits<{ (e: 'select', user: User): void }>()
</script>

<template>
  <p v-if="loading">Загрузка...</p>
  <ul v-else>
    <li v-for="u in users" :key="u.id" @click="$emit('select', u)">{{ u.name }}</li>
  </ul>
</template>
```

```vue
<!-- UsersPage.vue — контейнер: здесь живут все сайд-эффекты -->
<script setup lang="ts">
import { useFetch } from '@/composables/useFetch'
const { data: users, loading } = useFetch<User[]>('/api/users')
const onSelect = (user: User) => router.push({ name: 'user', params: { id: user.id } })
</script>

<template>
  <UserList :users="users ?? []" :loading="loading" @select="onSelect" />
</template>
```

#### Механизмы

##### Отличительные особенности системы реактивности разных версий Vue (Vue 2: Object.defineProperty, Vue 3: Proxy)
Vue 2 делал свойства реактивными через `Object.defineProperty`, что не позволяло отслеживать добавление новых свойств и изменение массивов по индексу. Vue 3 использует `Proxy`, который перехватывает любые операции над объектом (включая добавление ключей), устраняя эти ограничения.

##### Техники сохранения реактивности во Vue 2 при работе со структурами (мутации, Vue.set)
Из-за ограничений `Object.defineProperty` требовалось использовать `Vue.set(obj, key, value)`/`this.$set` для добавления новых реактивных свойств и `Vue.delete` для удаления, а также методы-мутаторы массива (`push`, `splice`) вместо прямого присвоения по индексу.

##### Техники сохранения реактивности во Vue 3 при деструктуризации и передаче параметров внутри компонента (toRefs, переоборачивание)
Деструктуризация `reactive`-объекта разрывает реактивную связь; чтобы её сохранить, используют `toRefs`, превращающий каждое свойство в отдельный `ref`, либо передают исходный реактивный объект целиком без деструктуризации.

```js
const state = reactive({ x: 1, y: 2 })
const { x, y } = toRefs(state) // x, y остаются реактивными
```

##### Как негативно влияет нахождение директивы v-if на том же элементе, что и v-for
На одном элементе `v-if` имеет более высокий приоритет, чем `v-for` (Vue 3), из-за чего `v-if` не имеет доступа к переменной цикла и, что важнее, условие пересчитывается на каждой итерации — это неэффективно и обычно признак ошибки; правильнее оборачивать список или выносить фильтрацию в `computed`.

##### Способы задания разметки через template, JSX и render-функции
Разметку можно описывать декларативным `template` (компилируется в оптимизированную render-функцию), либо через JSX, либо напрямую через ручные render-функции (`h(...)`) — используются, когда нужна гибкость, недостижимая в шаблоне.

```js
import { h, ref } from 'vue'
export default {
  setup() {
    const count = ref(0)
    return () => h('button', { onClick: () => count.value++ }, `Count: ${count.value}`)
  }
}
```

##### Управление сайд-эффектами: watchEffect, flush и nextTick

Эффекты по умолчанию выполняются **до** обновления DOM (`flush: 'pre'`). Если эффекту нужен уже обновлённый DOM (замер размеров, инициализация сторонней библиотеки на узле) — нужен `flush: 'post'`. `flush: 'sync'` запускает эффект синхронно на каждое изменение и почти всегда является ошибкой производительности.

`nextTick` — точечная альтернатива: вернуть управление после ближайшего обновления DOM в императивном коде.

```js
import { watch, watchEffect, nextTick } from 'vue'

// эффект зависит от отрендеренного DOM → post
watchEffect(() => chart.resize(container.value.clientWidth), { flush: 'post' })

// разовый императивный сценарий: сначала показать блок, потом сфокусировать
async function open() {
  visible.value = true
  await nextTick()          // ждём, пока input появится в DOM
  inputRef.value.focus()
}

// остановка эффекта вручную, если он больше не нужен
const stop = watch(source, handler)
stop()
```

##### Рефакторинг inline-функций и тяжёлых вычислений в шаблоне

Вызов функции прямо в шаблоне — в интерполяции или в привязке вида `:class="calc(item)"` — выполняется на каждом ре-рендере и не кешируется, в отличие от `computed`. Inline-стрелка в обработчике (`@click="() => select(item)"`) создаёт новую функцию на каждый рендер, что мешает оптимизациям компилятора и ломает мемоизацию дочерних компонентов.

```vue
<!-- Плохо: фильтрация и форматирование на каждый рендер -->
<template>
  <li v-for="u in users.filter(u => u.active).sort(byName)" :key="u.id">
    {{ new Intl.NumberFormat('ru').format(u.balance) }}
  </li>
</template>
```

```vue
<!-- Хорошо: тяжёлое считается один раз и кешируется -->
<script setup>
import { computed } from 'vue'
const formatter = new Intl.NumberFormat('ru')            // создаём один раз
const activeUsers = computed(() =>
  props.users.filter(u => u.active).sort(byName)
)
const rows = computed(() =>
  activeUsers.value.map(u => ({ ...u, balanceText: formatter.format(u.balance) }))
)
</script>

<template>
  <li v-for="row in rows" :key="row.id">{{ row.balanceText }}</li>
</template>
```

##### Оптимизация действительно тяжёлых вычислений: алгоритм, бекенд, Web Worker

Когда `computed` уже не спасает (десятки тысяч элементов, сортировка + группировка + агрегация на каждый ввод), порядок действий такой:

1. **Алгоритмическая оптимизация.** Заменить перебор в цикле на индекс (`Map`), убрать вложенные `O(n²)` проходы, считать агрегаты инкрементально, дебаунсить пользовательский ввод.
2. **Перенос на бекенд.** Пагинация, фильтрация и сортировка на сервере почти всегда дешевле, чем перегон всего массива в браузер. Это переговорная задача — согласовать изменение API.
3. **Вынос в Web Worker.** Если считать всё равно нужно на клиенте — перенести расчёт в отдельный поток, чтобы не блокировать рендеринг и не ронять INP.

```ts
// composables/useHeavyCalc.ts
import { ref, onUnmounted } from 'vue'

export function useHeavyCalc() {
  // Vite умеет собирать воркер по такому импорту
  const worker = new Worker(new URL('../workers/aggregate.ts', import.meta.url), { type: 'module' })
  const result = ref<Aggregate | null>(null)

  worker.onmessage = (e) => { result.value = e.data }
  const calc = (rows: Row[]) => worker.postMessage(rows)   // главный поток свободен

  onUnmounted(() => worker.terminate())                    // обязательный cleanup
  return { result, calc }
}
```

##### Профилирование рендеринга и анализ бандла

Профилирование отвечает на вопрос «что тормозит», а не «что кажется тяжёлым». Vue Devtools показывает дерево компонентов, время их рендера и лишние обновления; вкладка Performance в Chrome DevTools — реальный timeline с long tasks, layout и стилями.

Порядок диагностики лишних ре-рендеров:

1. Во вкладке Performance Vue Devtools записать взаимодействие и найти компоненты с аномальным числом рендеров.
2. Проверить их источники реактивности: не подписан ли компонент на весь store вместо конкретного геттера, нет ли `reactive`-объекта, который целиком пересоздаётся.
3. Проверить `key` в списках — нестабильный `key` (индекс, `Math.random()`) приводит к полному пересозданию узлов.
4. Проверить, не передаются ли в дочерние компоненты новые объекты/функции на каждый рендер.

```bash
# анализ размера бандла: что именно занимает место
npx vite-bundle-visualizer
# или плагин rollup-plugin-visualizer в vite.config.js
```

#### Компоненты экосистемы

##### Особенности и отличия Pinia от Vuex и детали миграции
Pinia не требует мутаций (state меняется напрямую в actions), не имеет вложенных модулей с namespace-строками — каждый store независим и плоский, полностью типобезопасна из коробки. Миграция сводится к разбиению namespaced-модулей Vuex на отдельные `defineStore` и замене `commit`/`dispatch` на прямые вызовы.

##### Как применять SSR-hydration для синхронизации store и router
При SSR состояние стора и роутера, посчитанное на сервере, сериализуется и передаётся клиенту, где на этапе гидратации восстанавливается в те же store/router-инстансы — так избегается повторный запрос данных и рассинхронизация первого рендера.

##### Как настраивать lazy-loading routes, prefetch, transitions, scrollBehavior в роутинге
```js
{ path: '/admin', component: AdminLayout, children: [
  { path: 'users', component: UsersPage },
  { path: 'settings', component: SettingsPage }
]}
```
Компоненты роутов подгружаются лениво через динамический `import()`, переходы между страницами оборачиваются в `<Transition>`, а `scrollBehavior` в конфиге роутера управляет позицией скролла при навигации.

##### Плагины Pinia и организация сторов на уровне приложения

Плагин Pinia — функция, которая получает контекст каждого создаваемого store и может добавить ему свойства, обернуть actions или подписаться на изменения. Типовые применения: персистентность, логирование, проброс общих зависимостей (роутер, API-клиент).

```ts
// plugins/persist.ts
import type { PiniaPluginContext } from 'pinia'

export function persistPlugin({ store, options }: PiniaPluginContext) {
  if (!options.persist) return                       // включаем точечно, по флагу в defineStore
  const saved = localStorage.getItem(store.$id)
  if (saved) store.$patch(JSON.parse(saved))

  store.$subscribe((_mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state))
  })
}

// main.ts
const pinia = createPinia()
pinia.use(persistPlugin)
pinia.use(({ store }) => { store.$router = router }) // общая зависимость для всех сторов
```

Организация сторов на уровне приложения: один store — одна доменная область (`useCartStore`, `useAuthStore`, `useCatalogStore`), а не один «god store» на всё приложение. Связи между сторами выражаются вызовом одного store внутри другого, а не дублированием состояния; всё, что можно вычислить — держится в геттерах, а не в отдельном поле state.

```ts
export const useCheckoutStore = defineStore('checkout', () => {
  const cart = useCartStore()                       // композиция сторов вместо дублирования
  const auth = useAuthStore()
  const canSubmit = computed(() => !cart.isEmpty && auth.isLoggedIn)
  return { canSubmit }
})
```

##### Оптимизация лишних перерендеров при работе с Vuex

Главная причина лишних обновлений во Vuex — подписка компонента на слишком широкий кусок состояния: `mapState` целого модуля или геттер, возвращающий новый объект/массив на каждый вызов (новая ссылка = «изменение» для любого потребителя).

```js
// Плохо: новый массив на каждый вызов → все подписчики обновляются всегда
getters: {
  visibleItems: (state) => state.items.filter(i => i.visible).map(i => ({ ...i })),
}

// Лучше: без пересоздания объектов, кеш геттера работает по ссылке на state.items
getters: {
  visibleItems: (state) => state.items.filter(i => i.visible),
}
```

```js
// Плохо: компонент подписан на весь модуль
computed: { ...mapState('catalog', ['items', 'filters', 'meta', 'ui']) }

// Лучше: только то, что реально рендерится
computed: { ...mapGetters('catalog', ['visibleItems']) }
```

Дополнительно помогают: разбиение крупных модулей на несколько, вынос часто меняющегося UI-состояния (ховеры, позиция скролла) из глобального стора в локальный, и `Object.freeze` для больших неизменяемых справочников, чтобы Vue 2 не делал их реактивными.

##### Layout-based роутинг, вложенные маршруты и нетривиальные guards

Layout-подход: общий каркас страницы (шапка, сайдбар) — это родительский маршрут с `<router-view />` внутри, а конкретные страницы — его `children`. Так layout не размонтируется при переходах между страницами и сохраняет состояние.

```js
const routes = [
  {
    path: '/app',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/pages/Dashboard.vue') },
      {
        path: 'orders',
        component: () => import('@/pages/orders/OrdersLayout.vue'),
        children: [
          { path: '', name: 'orders', component: () => import('@/pages/orders/List.vue') },
          { path: ':id', name: 'order', component: () => import('@/pages/orders/Details.vue'), props: true },
        ],
      },
    ],
  },
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue') },
]
```

Нетривиальные guards решают три типовые задачи — авторизация с возвратом на исходную страницу, отмена перехода при несохранённых изменениях и ожидание асинхронной инициализации:

```js
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.restoreSession()      // ждём восстановление сессии
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.role && !auth.hasRole(to.meta.role)) return { name: 'forbidden' }
})

// защита от потери данных формы — на уровне конкретного компонента
onBeforeRouteLeave((to, from) => {
  if (form.isDirty && !confirm('Изменения не сохранены. Уйти со страницы?')) return false
})

router.afterEach((to) => { document.title = to.meta.title ?? 'Приложение' }) // DOM-эффекты — после перехода
```

#### Инструменты

##### Отличия runtime-only и compiler-inclusive сборок
Runtime-only сборка не содержит компилятор шаблонов (легче), требует предкомпилированные render-функции (как это делает Vite/vue-loader через SFC). Compiler-inclusive сборка умеет компилировать шаблоны прямо в браузере (например, строковые шаблоны на лету), но тяжелее.

##### Возможности и ограничения Vue Devtools для отладки и профилирования компонентов
Devtools позволяет инспектировать дерево компонентов, их props/state, историю событий Pinia, а также профилировать рендеринг во вкладке Performance для поиска лишних ре-рендеров; ограничение — не всегда точно показывает внутренние render-функции и кастомные renderer'ы.

##### Настройка production-сборки: code splitting и анализ бандла

Задача production-сборки — отдать пользователю минимум кода для первого экрана. Основные рычаги: ленивые маршруты (каждый становится отдельным чанком), выделение стабильных вендоров в отдельный чанк для долгого кеширования и контроль размера через анализатор.

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [vue(), visualizer({ filename: 'stats.html', gzipSize: true })],
  build: {
    sourcemap: 'hidden',                 // карты собираются, но не ссылаются из бандла
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],   // редко меняется → отдельный долгоживущий чанк
          charts: ['echarts'],                   // тяжёлая библиотека отдельно
        },
      },
    },
  },
})
```

```bash
npm run build          # смотрим размеры чанков в выводе
npx vite-bundle-visualizer   # что именно попало в бандл
```

Что искать в отчёте: дублирующиеся версии одной библиотеки, полный `lodash`/`moment` вместо точечных импортов, случайно попавшие в основной чанк тяжёлые зависимости (обычно из-за статического импорта в общем модуле вместо динамического).

##### Тестирование компонентов и composables с Vue Test Utils

Полное покрытие компонента — это не только «рендерится», а четыре группы проверок: рендер по входным props, реакция на пользовательские действия, испускаемые события и поведение при асинхронных состояниях (загрузка/ошибка). Внешние зависимости (store, роутер, сеть) подменяются, чтобы тест проверял компонент, а не бекенд.

```ts
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UsersPage from '@/pages/UsersPage.vue'

describe('UsersPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([{ id: 1, name: 'Аня' }]) })
  })

  const factory = (props = {}) =>
    mount(UsersPage, {
      props,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],  // сторы замоканы
        stubs: { RouterLink: true },                          // роутер не нужен для этого теста
      },
    })

  it('показывает загрузку, затем список', async () => {
    const wrapper = factory()
    expect(wrapper.text()).toContain('Загрузка')
    await flushPromises()                                     // дожидаемся промисов и перерисовки
    expect(wrapper.findAll('li')).toHaveLength(1)
  })

  it('эмитит select при клике по строке', async () => {
    const wrapper = factory()
    await flushPromises()
    await wrapper.find('li').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([{ id: 1, name: 'Аня' }])
  })
})
```

Composable тестируется без монтирования, если не использует хуки жизненного цикла; если использует — оборачивается в тестовый компонент:

```ts
import { withSetup } from './helpers'   // монтирует пустой компонент и вызывает composable внутри

it('отменяет запрос при размонтировании', async () => {
  const [{ loading }, app] = withSetup(() => useFetch('/api/users'))
  expect(loading.value).toBe(true)
  app.unmount()                          // проверяем, что cleanup отработал
})
```

#### Internals / Непубличное API

##### Может читать часть кода @vue/runtime-core и @vue/compiler-core, понимает архитектурные границы (что публично, что нет).
Публичный API документирован и стабилен между минорными версиями; внутренние функции (например, доступные через `getCurrentInstance`) используются самим фреймворком и экосистемой, но не гарантируют обратную совместимость.

```js
import { getCurrentInstance } from 'vue'
// используется точечно для интеграции со сторонней библиотекой, требующей доступ к internal instance;
// решение задокументировано комментарием с риском breaking change при апдейте Vue
const instance = getCurrentInstance()
```

#### SSR и гидрация

##### Как настроить параметры SSR-сборки в Nuxt
Базовые параметры (режим рендеринга, таргет, nitro-пресет) задаются в `nuxt.config.ts`; для отдельных страниц/групп маршрутов SSR-поведение можно переопределить через `routeRules`.

##### Как работать с безопасным доступом к window/document в SSR
На сервере `window`/`document` не существуют, поэтому обращение к ним оборачивают в проверку окружения (`import.meta.client`/`process.client`) или переносят в `onMounted`, который выполняется только на клиенте.

```vue
<script setup>
const { data: users } = await useAsyncData('users', () => $fetch('/api/users'))
</script>
```
