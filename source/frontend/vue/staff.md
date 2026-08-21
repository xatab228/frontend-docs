# Vue — Staff

## Механизмы

### Принципы работы внутренних механизмов планировщика (scheduler) и обновлений: batching, microtasks, flushSync

Изменение реактивного значения не рендерит компонент немедленно. Оно помечает связанные эффекты как «грязные» и ставит их задание в очередь планировщика, которая разбирается в микротаске.

Как это устроено внутри `@vue/runtime-core`:

- **Очередь заданий (`queue`).** Задания отсортированы по `id` эффекта — родитель обновляется раньше потомка, поэтому потомок не рендерится дважды, если родитель его пересоздаёт.
- **Дедупликация.** Задание, уже стоящее в очереди, повторно не добавляется — отсюда батчинг: сто записей в один `ref` за синхронный блок дадут один рендер.
- **Микротаска.** Очередь сбрасывается через `Promise.resolve().then(flushJobs)` — то есть после текущего синхронного кода, но до отрисовки браузером.
- **Пре- и пост-очереди.** `flush: 'pre'` (по умолчанию для `watch`) выполняется перед рендером компонента, `flush: 'post'` — после обновления DOM, `flush: 'sync'` — немедленно, минуя очередь.
- **Защита от циклов.** Если задание перезапускается больше сотни раз за один сброс, Vue бросает предупреждение о бесконечном цикле обновлений.

```js
const count = ref(0)

count.value++
count.value++
count.value++            // три записи → одно задание в очереди → один рендер

await nextTick()         // возвращает тот же промис, что и сброс очереди
console.log(el.textContent) // '3' — DOM уже обновлён
```

`flushSync`-семантика (в Vue это `flush: 'sync'` и ручной вызов сброса очереди) нужна редко: при интеграции со сторонним императивным кодом, которому DOM требуется прямо сейчас. Плата — потеря батчинга: каждое изменение вызывает отдельный проход, и в цикле это превращается в квадратичную работу.

### Особенности lazy-вычислений: computed и некоторые эффекты

`computed` — ленивый эффект с кешем. Его значение не пересчитывается при изменении зависимостей: зависимость лишь помечает вычисление устаревшим, а реальный пересчёт происходит при следующем чтении `.value`.

Механика в Vue 3.4+:

1. У вычисляемого есть флаг `_dirty` и версия глобальных изменений.
2. Изменение зависимости запускает `triggerRefValue` — вычисляемое помечается грязным и оповещает своих подписчиков.
3. Чтение `.value` проверяет флаг: если грязное — пересчитывает геттер и сравнивает результат с предыдущим.
4. Если новое значение равно старому, подписчики не оповещаются — цепочка обновлений обрывается, и лишнего рендера не происходит.

```js
const items = ref([1, 2, 3])
const evenCount = computed(() => items.value.filter((n) => n % 2 === 0).length)

items.value = [1, 2, 3, 5]   // зависимость изменилась
// геттер ещё не выполнялся — только пометка «устарело»
console.log(evenCount.value) // здесь произойдёт пересчёт, значение прежнее (1)
// подписчики не оповещаются: результат не изменился
```

Практические следствия: `computed`, которое никто не читает, не выполняется вообще (в отличие от `watchEffect`); дорогие вычисления безопаснее держать в `computed`, чем в `watch` с записью в `ref`; побочные эффекты внутри геттера недопустимы — момент его выполнения не определён; `computed` с записью (`get`/`set`) остаётся ленивым только по чтению.

### Устройство компилятора (parse, transform, generate), и как шаблон превращается в runtime-код

`@vue/compiler-core` работает в три фазы.

1. **Parse.** Строка шаблона превращается в AST: элементы, интерполяции, директивы, текст. Парсер контекстно-зависимый — знает про HTML-сущности, самозакрывающиеся теги, `<pre>`.
2. **Transform.** По AST проходят трансформеры (`transformElement`, `transformText`, `transformIf`, `transformFor`, `vBind`, `vOn`). Здесь происходят все оптимизации: статические узлы поднимаются в константы (hoisting), динамические привязки помечаются patch flags, блоки получают массив динамических потомков.
3. **Generate.** Из преобразованного AST генерируется исходный код render-функции со строкой импортов из `vue` и source map.

```js
// Что видит разработчик
// <div class="row"><span>{{ msg }}</span></div>

// Во что это превращается (упрощённо)
const _hoisted_1 = { class: "row" }   // статика поднята: создаётся один раз на модуль

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("span", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
    //                                                          ^ patch flag: меняется только текст
  ]))
}
```

Patch flags — ключ к производительности: при обновлении рантайм не сравнивает узел целиком, а идёт прямо к тому, что помечено динамическим. Блочная структура (`openBlock`/`createElementBlock`) позволяет пропускать статические поддеревья при сравнении. Именно эти оптимизации теряются при переходе на ручные render-функции и JSX — там компилятор не знает, что статично, а что нет.

### Особенности реализации реактивности: track, trigger и её ограничения (когда объекты не трекаются, когда нужен markRaw)

`@vue/reactivity` строится на двух операциях: `track` (запомнить, что текущий активный эффект зависит от пары объект+ключ) и `trigger` (запустить эффекты, зависящие от этой пары).

- **`targetMap`** — `WeakMap<target, Map<key, Dep>>`. Для каждого объекта хранится карта ключей, для каждого ключа — множество зависимых эффектов.
- **`activeEffect`** — текущий выполняющийся эффект; во время его выполнения любое чтение реактивного свойства через `Proxy.get` вызывает `track`.
- **Запись** через `Proxy.set` вызывает `trigger`, который ставит задания зависимых эффектов в очередь планировщика.
- **Массивы и коллекции** обрабатываются отдельно: перехватываются методы-мутаторы, отслеживается `length`, для `Map`/`Set` подменяются `get`/`set`/`has`/`forEach`.

Где реактивность не работает:

| Ситуация | Причина | Что делать |
|---|---|---|
| Деструктуризация `reactive`-объекта | извлекается значение, а не ссылка на свойство | `toRefs`, передавать объект целиком |
| Замена `reactive`-объекта целиком | переменная указывает на новый объект, старый Proxy теряется | использовать `ref` или `Object.assign` |
| Чтение вне эффекта | нет `activeEffect`, `track` не срабатывает | читать внутри `computed`/`watch`/рендера |
| Классы со сложным внутренним состоянием, инстансы библиотек | Proxy оборачивает вложенные объекты и ломает внутренние инварианты | `markRaw` |
| Большие неизменяемые структуры | глубокое оборачивание стоит времени и памяти | `shallowRef`, `shallowReactive`, `markRaw` |

```js
import { reactive, markRaw, shallowRef } from 'vue'

// Инстанс сторонней библиотеки не должен попадать под Proxy
const state = reactive({
  map: markRaw(new MapLibrary(el)),   // Vue не будет оборачивать внутренности
  rows: [],
})

// Большой набор данных: реактивна только замена ссылки
const dataset = shallowRef(bigArray)
dataset.value = nextBigArray          // одно оповещение вместо обхода тысяч полей
```

Профилирование реактивности выполняется через `onTrack`/`onTrigger` в опциях `watch`/`watchEffect` (только в dev-сборке): они показывают, какая именно зависимость вызвала перезапуск эффекта — самый быстрый способ найти неожиданную подписку.

### Реализация кастомных реактивных структур (customRef с debounce, batched update)

`customRef` даёт полный контроль над тем, когда вызывать `track` и `trigger`, — на нём строятся контейнеры с собственной политикой оповещения.

```ts
// Debounce: значение записывается сразу, подписчики узнают об этом с задержкой
export function debouncedRef<T>(value: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>
  return customRef<T>((track, trigger) => ({
    get() { track(); return value },
    set(next) {
      value = next
      clearTimeout(timer)
      timer = setTimeout(trigger, delay)
    },
  }))
}

// Batched update: множество записей за тик → одно оповещение
export function batchedRef<T>(value: T) {
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

// Синхронизация с внешним источником: значение живёт вне Vue, но участвует в реактивности
export function externalRef<T>(store: ExternalStore<T>) {
  return customRef<T>((track, trigger) => {
    store.subscribe(() => trigger())      // внешнее изменение оповещает подписчиков Vue
    return {
      get() { track(); return store.get() },
      set(next) { store.set(next) },
    }
  })
}
```

Правило корректности: `track` вызывается на каждое чтение (иначе подписка не установится при первом обращении внутри нового эффекта), `trigger` — только при реальном изменении значения, а любая подписка на внешний источник обязана иметь отписку, иначе контейнер удерживает эффекты после размонтирования компонента.

### Custom scheduler и кеширование на уровне рендера

Эффект в Vue принимает `scheduler` — функцию, которая решает, *когда* выполнить перезапуск. Планировщик по умолчанию ставит задание в очередь микротаски; собственный планировщик позволяет привязать обновления к другому ритму.

```ts
import { effect, stop } from '@vue/reactivity'

// Обновление не чаще одного раза за кадр — для анимаций и высокочастотных источников
const runner = effect(() => draw(state.points), {
  lazy: true,
  scheduler: (job) => {
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; job() }) }
  },
})

// Низкоприоритетное обновление: выполняем, когда браузер свободен
const bgRunner = effect(() => recomputeStats(state), {
  lazy: true,
  scheduler: (job) => scheduler.postTask(job, { priority: 'background' }),
})

onUnmounted(() => { stop(runner); stop(bgRunner) })
```

Кеширование на уровне рендера строится теми же средствами, что использует компилятор: `v-memo` для строк списка с явными зависимостями, `v-once` для неизменной разметки, ручная мемоизация VNode в render-функциях через `_cache`, `KeepAlive` для сохранения инстансов компонентов между переключениями. Каждый из приёмов даёт выигрыш только при подтверждённой профилированием проблеме — в обычном случае накладные расходы на проверку зависимостей превышают экономию.

### Профилирование trigger/track и механизмов effect, dep, scheduler

Диагностика лишних обновлений идёт от симптома к конкретной зависимости:

1. **Vue Devtools → Performance** — какие компоненты рендерятся аномально часто и долго.
2. **`onTrack` / `onTrigger`** — какая именно пара объект+ключ вызвала перезапуск конкретного эффекта.
3. **`app.config.performance = true`** — метки `performance.measure` для init/render компонентов, видны в трейсе Chrome DevTools.
4. **Chrome DevTools → Performance** — long tasks, доля времени в скриптах против layout/paint.

```js
watchEffect(
  () => { render(state) },
  {
    onTrack(e) { console.log('подписались на', e.key, e.target) },   // только dev
    onTrigger(e) { debugger },                                       // остановка в момент причины
  }
)
```

Типичные находки такого профилирования: подписка на весь store вместо конкретного геттера, `reactive`-объект, пересоздаваемый целиком вместо точечного обновления, эффект с `flush: 'sync'` в горячем пути, глубокий `watch` с `deep: true` по большой структуре, нестабильные ключи в списках.

## Инструменты

### Pipeline сборки Vue-компонента на уровне AST

`.vue` — не формат, понятный сборщику: его превращает в JS-модуль плагин (`@vitejs/plugin-vue` или `vue-loader`) через `@vue/compiler-sfc`.

Этапы:

1. **`parse`** — SFC разбирается на дескриптор блоков: `template`, `script`, `scriptSetup`, массив `styles`, произвольные кастомные блоки.
2. **`compileScript`** — `<script setup>` компилируется в обычный `setup()`: макросы `defineProps`/`defineEmits`/`defineExpose` разворачиваются, привязки анализируются и передаются компилятору шаблона, типы из TS превращаются в рантайм-объявления props.
3. **`compileTemplate`** — шаблон проходит parse/transform/generate и становится render-функцией; сюда же передаётся `scopeId` для scoped-стилей и список привязок из шага 2.
4. **`compileStyle`** — стили обрабатываются препроцессором, для `scoped` добавляется атрибутный селектор, для `<style module>` генерируется объект классов.
5. **Сборка модуля.** Плагин склеивает результаты в один модуль: объект компонента, `render`, `__scopeId`, HMR-обвязка в dev-режиме.

```js
// Что делает плагин, если разобрать это вручную
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const { descriptor } = parse(source, { filename: 'Button.vue' })
const script = compileScript(descriptor, { id: scopeId })
const template = compileTemplate({
  source: descriptor.template.content,
  id: scopeId,
  filename: 'Button.vue',
  compilerOptions: { bindingMetadata: script.bindings }, // связь между setup и шаблоном
})
```

### Разработка кастомных плагинов для Vite или Rollup для обработки `.vue` файлов

Собственный плагин нужен, когда требуется свой кастомный блок в SFC, кодогенерация или анализ компонентов на этапе сборки.

```ts
// Плагин: собственный блок <meta> в SFC → метаданные компонента в рантайме
import { parse } from '@vue/compiler-sfc'
import type { Plugin } from 'vite'

export function sfcMetaPlugin(): Plugin {
  return {
    name: 'sfc-meta',
    enforce: 'pre',                       // до основного плагина Vue
    transform(code, id) {
      if (!id.endsWith('.vue')) return
      const { descriptor } = parse(code, { filename: id })
      const block = descriptor.customBlocks.find((b) => b.type === 'meta')
      if (!block) return
      const meta = JSON.parse(block.content)
      // возвращаем добавку, которая навесит метаданные на экспортируемый компонент
      return {
        code: `${code}\n<script>export const __meta = ${JSON.stringify(meta)}</script>`,
        map: null,
      }
    },
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.vue')) return undefined  // не мешаем штатному HMR
    },
  }
}
```

Требования к такому плагину: корректные source maps (иначе отладка и стектрейсы ломаются), учёт HMR (`handleHotUpdate` не должен глушить обновление компонентов), кеширование по содержимому, обработка и dev-, и build-режимов, а также совместимость порядка (`enforce`) с `@vitejs/plugin-vue` — работа с SFC до его трансформации и с готовым JS после.

## Internals / Непубличное API

### Где модифицировать код ядра Vue (runtime / compiler), если необходим monkey-patching из-за ограничений системы

Патчинг ядра — крайняя мера, к которой прибегают, когда обходных путей нет: критичный баг во фреймворке, специфичное требование окружения (WebView, встраиваемая платформа), интеграция с системой, ожидающей нестандартного поведения.

Точки, в которые вообще имеет смысл вмешиваться, и подходящие им инструменты:

| Уровень | Что здесь можно изменить | Как правильно |
|---|---|---|
| Компилятор шаблонов | генерация кода, свои директивы | `compilerOptions.nodeTransforms` / `directiveTransforms` — публичная точка расширения |
| Рантайм-рендерер | операции с узлами платформы | `createRenderer` с собственными операциями вместо патча DOM-рендерера |
| Конфигурация приложения | обработка ошибок, warn-хендлер, глобальные свойства | `app.config.errorHandler`, `app.config.warnHandler` |
| Резолвинг компонентов и директив | подмена реализаций | `app.component`, плагины приложения |
| Патч VNode / внутренние хуки | тонкая интеграция с devtools и профилировщиками | внутренние хуки, только с изоляцией и тестами |

```js
// Если патч всё же неизбежен: точечная обёртка вместо правки исходников,
// с проверкой версии и фолбэком на штатное поведение
import * as runtimeCore from '@vue/runtime-core'
import { version } from 'vue'

const SUPPORTED = /^3\.(4|5)\./
if (!SUPPORTED.test(version)) {
  console.warn(`[patch] Vue ${version} не проверена, патч отключён`)
} else {
  const original = runtimeCore.warn
  // пример: маршрутизация предупреждений Vue в общую систему наблюдаемости
  Object.defineProperty(runtimeCore, 'warn', {
    value: (...args) => { telemetry.capture('vue:warn', args); original(...args) },
  })
}
```

Дисциплина сопровождения такого решения: патч живёт в одном модуле с описанием причины и ссылкой на upstream-issue, версия `vue` зафиксирована точно (не диапазоном), есть тест, падающий при изменении поведения ядра, и есть план выхода — как только фикс попадает в релиз Vue, патч удаляется. Альтернативы, которые почти всегда предпочтительнее: форк с патчем через `patch-package`/`pnpm patch` (изменение видно в ревью и переживает установку зависимостей) и Feature Request в upstream.

### Безопасное использование непубличных интерфейсов с тестами и фолбэком

Непубличное API не имеет гарантий совместимости, поэтому его использование оформляется как изолированный риск, а не как обычный код.

```ts
// internal/vue-internals.ts — единственное место в проекте, знающее о внутренностях
import { getCurrentInstance, version } from 'vue'

/**
 * Доступ к внутреннему инстансу нужен для интеграции с профилировщиком:
 * публичного способа получить uid и дерево родителей нет.
 * Upstream: https://github.com/vuejs/core/issues/XXXX
 * Проверяется тестом internals.spec.ts при каждом обновлении Vue.
 */
export function getComponentPath(): string[] {
  try {
    let instance = getCurrentInstance() as any
    const path: string[] = []
    while (instance) {
      path.unshift(instance.type?.__name ?? instance.type?.name ?? 'Anonymous')
      instance = instance.parent
    }
    return path
  } catch {
    return ['unknown']            // фолбэк: интеграция деградирует, приложение работает
  }
}
```

```ts
// Тест-страж: ломается сразу при несовместимом изменении внутренностей
it('внутренний инстанс сохраняет ожидаемую форму', () => {
  const [path] = withSetup(() => getComponentPath())
  expect(path.length).toBeGreaterThan(0)
})
```

Правила: одна точка соприкосновения, точная версия зависимости, обязательный фолбэк, тест-страж в CI, запись в реестре технического долга. Если внутреннее API оказывается в горячем пути продукта — решение пересматривается: цена внезапной поломки при обновлении выше выигрыша.

### Использование внутренних хуков для интеграций (custom VNode patching)

Vue предоставляет несколько уровней вмешательства в жизненный цикл узлов — от полностью публичных до внутренних.

```js
// Публичный уровень: хуки директивы дают доступ к элементу на каждой стадии
const vTrack = {
  created(el, binding, vnode) {},
  beforeMount(el) {},
  mounted(el, binding) { analytics.observe(el, binding.value) },
  beforeUpdate(el, binding, vnode, prevVnode) {},
  updated(el, binding) { analytics.update(el, binding.value) },
  beforeUnmount(el) { analytics.unobserve(el) },
}

// Уровень VNode-хуков: навешиваются прямо на узел в render-функции
h(Child, {
  onVnodeMounted(vnode) { instrument(vnode.el) },
  onVnodeUpdated(vnode, prevVnode) { diffReport(prevVnode, vnode) },
  onVnodeBeforeUnmount(vnode) { cleanup(vnode.el) },
})
```

Такие хуки используются в инструментах: профилировщики, системы аналитики разметки, обёртки для анимаций, мосты к сторонним рендерерам. Для продуктового кода почти всегда достаточно директив и обычных хуков жизненного цикла — VNode-хуки оправданы только в инфраструктурных пакетах, где нужен доступ к каждому узлу без изменения самих компонентов.

### Собственные renderer API (например, для WebGL, Canvas)

Ядро Vue не знает о DOM: реактивность, компоненты и сравнение деревьев живут в `@vue/runtime-core`, а операции с узлами передаются извне через `createRenderer`. Это позволяет отрисовывать компонентное дерево на любой платформе.

```ts
import { createRenderer } from '@vue/runtime-core'

interface CanvasNode { type: string; props: Record<string, unknown>; children: CanvasNode[]; parent?: CanvasNode }

const { createApp } = createRenderer<CanvasNode, CanvasNode>({
  createElement: (type) => ({ type, props: {}, children: [] }),
  createText: (text) => ({ type: 'text', props: { text }, children: [] }),
  setText: (node, text) => { node.props.text = text },
  setElementText: (node, text) => { node.children = [{ type: 'text', props: { text }, children: [] }] },
  patchProp: (node, key, prev, next) => { node.props[key] = next },
  insert: (child, parent, anchor) => {
    child.parent = parent
    const i = anchor ? parent.children.indexOf(anchor) : parent.children.length
    parent.children.splice(i, 0, child)
  },
  remove: (child) => {
    const arr = child.parent?.children
    if (arr) arr.splice(arr.indexOf(child), 1)
  },
  parentNode: (node) => node.parent ?? null,
  nextSibling: (node) => {
    const arr = node.parent?.children ?? []
    return arr[arr.indexOf(node) + 1] ?? null
  },
})

// Дальше — обычные Vue-компоненты, но вместо DOM рисуется сцена
createApp(Scene).mount(rootNode)
requestAnimationFrame(function draw() { paint(ctx, rootNode); requestAnimationFrame(draw) })
```

Что придётся решить дополнительно при построении такого рендерера: обработку событий (попадание курсора считается вручную, всплытия нет), измерение и раскладку (нет CSS — нужен собственный layout или готовый движок), доступность (экранные дикторы не видят canvas — требуется параллельное DOM-дерево), интеграцию с devtools. Готовые примеры этого подхода — `vue-three`, `troisjs`, рендереры для терминала и нативных платформ.

## SSR и гидрация

### Обход ограничений SSR-фреймворков и доработка под нужды проекта

Когда штатных возможностей Nuxt не хватает, вмешательство идёт по возрастанию инвазивности: сначала публичные точки расширения, затем слой Nitro, и только в крайнем случае — собственный SSR-pipeline.

| Задача | Наименее инвазивное решение |
|---|---|
| Своя логика на каждом запросе | серверный middleware Nitro |
| Нестандартный эндпоинт вне модели страниц | `server/api/*` или собственный обработчик в Nitro |
| Изменение HTML-документа | хуки `render:html`, `render:response` |
| Кеширование ответа | `routeRules`, `defineCachedEventHandler` |
| Иная логика гидрации | ленивые/серверные компоненты, острова |
| Другой транспорт (streaming, SSE) | собственный обработчик поверх Nitro |
| Полностью иной жизненный цикл рендера | собственный pipeline на `vue/server-renderer` |

```ts
// Пример: потоковая отдача HTML собственным обработчиком, когда штатного рендера недостаточно
// server/routes/stream/[...].ts (Nitro)
import { renderToWebStream } from 'vue/server-renderer'

export default defineEventHandler(async (event) => {
  const { app, pinia } = await createSsrApp(event.path)   // новый инстанс на каждый запрос

  setHeader(event, 'content-type', 'text/html')
  setHeader(event, 'transfer-encoding', 'chunked')

  const head = `<!doctype html><html><head>${collectHead()}</head><body><div id="app">`
  const tail = `</div><script>window.__STATE__=${serializeSafe(pinia.state.value)}</script></body></html>`

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(head)                            // шапка уходит клиенту сразу
      const reader = renderToWebStream(app).getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        controller.enqueue(value)                         // разметка по частям
      }
      controller.enqueue(tail)
      controller.close()
    },
  })
})
```

Обязательные требования к любому такому решению: изоляция состояния по запросу (общий инстанс = утечка данных между пользователями), экранирование сериализованного состояния, таймаут рендера с фолбэком на CSR, корректная передача заголовков и куки в исходящие запросы, манифест ассетов для preload нужных чанков и тесты на гидрацию. И отдельный вопрос сопровождения: любая доработка в обход публичного API фиксируется как техдолг с планом возврата на штатный механизм, когда он появится в апстриме.
