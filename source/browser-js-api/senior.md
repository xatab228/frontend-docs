# Браузерные JS и API — Senior

### Принципы оптимизации DOM-манипуляций: батчинг операций

Каждое обращение к DOM, меняющее layout, потенциально вызывает пересчёт стилей и геометрии. Батчинг — объединение множества изменений в одну операцию, чтобы браузер пересчитал layout один раз, а не на каждое изменение. Практические приёмы: строить разметку вне документа (`DocumentFragment`, `innerHTML` целиком), отключать элемент от DOM на время массовых правок (`display: none` или клонирование), группировать чтения и записи раздельно.

```js
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.name;
  fragment.appendChild(li);
});
list.appendChild(fragment); // одна вставка в реальный DOM вместо N
```

### Механизмы reflow/repaint и их триггеры

Reflow (layout) — пересчёт геометрии элементов (размеры, позиции) при изменении, влияющем на layout: изменение размеров, добавление/удаление узлов, чтение геометрических свойств (`offsetWidth`, `getBoundingClientRect` и т.п., что форсирует синхронный пересчёт). Repaint — перерисовка пикселей без изменения geometry (цвет, тень) — дешевле reflow. Layout thrashing возникает, когда чтение и запись geometry чередуются в цикле, вызывая reflow на каждой итерации.

```js
// Плохо: чтение и запись чередуются -> layout thrashing
items.forEach(item => {
  item.style.width = box.offsetWidth + 'px'; // чтение offsetWidth форсирует reflow каждый раз
});

// Хорошо: сначала все чтения, потом все записи
const width = box.offsetWidth; // одно чтение
items.forEach(item => {
  item.style.width = width + 'px'; // только записи
});
```

Для плавных изменений (анимаций) стоит использовать `requestAnimationFrame`, синхронизированный с частотой обновления экрана:

```js
function animateProgress(el, from, to, duration) {
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = from + (to - from) * progress;
    el.style.width = `${value}%`;

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

animateProgress(document.querySelector('.bar'), 0, 100, 800);
```

### Shadow DOM и template элементы для инкапсуляции

Shadow DOM создаёт изолированное поддерево DOM внутри элемента, стили и разметка которого не пересекаются с основным документом (инкапсуляция CSS и структуры) — основа Web Components. `<template>` описывает разметку, которая не рендерится сразу, а клонируется по требованию через `content.cloneNode(true)`.

```js
class MyWidget extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' }); // 'closed' скрывает shadowRoot от внешнего JS
    const template = document.getElementById('widget-template');
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('my-widget', MyWidget);
```

```html
<template id="widget-template">
  <style>p { color: red; }</style>
  <p>Изолированный контент</p>
</template>
```

### MutationObserver для отслеживания изменений DOM

`MutationObserver` асинхронно (батчами, между тиками рендеринга) отслеживает изменения DOM: добавление/удаление узлов, изменение атрибутов, изменение текста — без polling'а, в отличие от устаревших событий мутаций.

```js
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    if (m.type === 'childList') console.log('добавлены/удалены узлы', m.addedNodes, m.removedNodes);
    if (m.type === 'attributes') console.log('атрибут изменён', m.attributeName);
  });
});

observer.observe(document.querySelector('#app'), {
  childList: true,
  attributes: true,
  subtree: true
});

// observer.disconnect(); когда наблюдение больше не нужно
```

### Клонирование узлов: cloneNode с deep/shallow копированием

`cloneNode(true)` — глубокое клонирование (весь узел вместе со всем поддеревом потомков), `cloneNode(false)` (или без аргумента) — поверхностное (только сам узел, без потомков). Важно: обработчики событий, повешенные через `addEventListener`, не копируются при клонировании — их нужно навешивать заново.

```js
const original = document.querySelector('.card');
const shallow = original.cloneNode(false); // без содержимого
const deep = original.cloneNode(true);      // с полным поддеревом
```

### CustomEvent и dispatchEvent для создания собственных событий

`CustomEvent` позволяет создавать собственные типы событий с произвольными данными в `detail`, `dispatchEvent` — инициировать их на элементе, включая распространение по фазам bubbling/capture, как у нативных событий.

```js
const event = new CustomEvent('my-event', {
  detail: { userId: 42 },
  bubbles: true,
  cancelable: true,
  composed: true // событие может пересекать границу shadow DOM
});

el.dispatchEvent(event);

el.addEventListener('my-event', (e) => console.log(e.detail.userId));
```

### Touch events и pointer events для мобильных устройств

Touch events (`touchstart`, `touchmove`, `touchend`) дают доступ к списку точек касания (`touches`, `changedTouches`, `targetTouches`), но специфичны только для сенсорных устройств. Pointer events (`pointerdown`, `pointermove`, `pointerup`) — унифицированный API, абстрагирующий мышь, тач и перо (`pointerType`) в одну модель событий, что упрощает поддержку кросс-платформенных интерфейсов.

```js
el.addEventListener('touchstart', (e) => {
  const touch = e.touches[0]; // массив всех активных точек касания
  console.log(touch.clientX, touch.clientY, e.changedTouches, e.targetTouches);
});

// Современный унифицированный подход
el.addEventListener('pointerdown', (e) => {
  console.log(e.pointerId, e.pointerType); // 'mouse' | 'touch' | 'pen'
  el.setPointerCapture(e.pointerId); // все последующие события указателя пойдут в этот элемент
});
```

### IndexedDB для хранения структурированных данных

IndexedDB — асинхронная NoSQL-БД в браузере для больших объёмов структурированных данных, поддерживает object stores (аналог таблиц), индексы для быстрого поиска и транзакции. В отличие от localStorage, работает асинхронно и хранит не только строки, а произвольные структуры (включая Blob).

```js
const request = indexedDB.open('ShopDB', 2);

request.onupgradeneeded = (e) => {
  const db = e.target.result;

  if (!db.objectStoreNames.contains('orders')) {
    const orders = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
    orders.createIndex('byUserId', 'userId', { unique: false });
    orders.createIndex('byStatus', 'status', { unique: false });
    orders.createIndex('byUserAndStatus', ['userId', 'status'], { unique: false });
  }

  if (!db.objectStoreNames.contains('products')) {
    db.createObjectStore('products', { keyPath: 'sku' });
  }
};
```

Схема продумывается заранее: `keyPath` как естественный или суррогатный ключ, индексы под реальные паттерны выборки (`byUserId`, составной `byUserAndStatus`), версия базы (`open('ShopDB', 2)`) увеличивается при изменении структуры — старая схема мигрируется в `onupgradeneeded`.

### Cache API и стратегии кэширования с версионированием

Cache API (обычно используется внутри Service Worker) хранит пары запрос/ответ. Версионирование имени кэша (`app-cache-v3`) позволяет при деплое новой версии создать новый кэш, а старые — удалить на этапе `activate`, избегая раздачи устаревших ресурсов.

```js
const CACHE_NAME = 'app-cache-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/', '/app.js', '/style.css']))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

Основные стратегии: cache-first (быстро, для статики), network-first (свежие данные с фоллбеком на кэш), stale-while-revalidate (отдать кэш сразу, обновить в фоне).

### Как синхронизировать данные и состояния между вкладками (BroadcastChannel, SharedWorkers, события storage)

- Событие `storage` — срабатывает автоматически в других вкладках того же origin при изменении `localStorage` (не в той вкладке, что изменила значение); просто, но ограничено строками и localStorage.
- `BroadcastChannel` — прямой канал сообщений между вкладками/воркерами одного origin, подписавшимися на один и тот же именованный канал; можно передавать произвольные структурированные данные, не завязываясь на localStorage.
- `SharedWorker` — один воркер, к которому подключаются несколько вкладок, может выступать центральным узлом состояния (например, единое WebSocket-соединение на все вкладки).

```js
// Событие storage — срабатывает в ДРУГИХ вкладках при изменении localStorage (не в той, что изменила)
window.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, e.newValue, e.url);
});
```

```js
// BroadcastChannel — произвольные сообщения между вкладками одного origin
const channel = new BroadcastChannel('app-sync');
channel.postMessage({ type: 'cart-updated', count: 3 });
channel.onmessage = (e) => console.log('получено в другой вкладке:', e.data);
```

### Особенности работы в private mode (инкогнито)

В приватном режиме некоторые браузеры (особенно старые версии Safari) ограничивают или полностью блокируют `localStorage`/`IndexedDB` (квота близка к нулю, запись выбрасывает исключение), поэтому код, критично зависящий от постоянного хранилища, должен проверять доступность и иметь fallback (например, in-memory Map) вместо падения приложения.

```js
async function getStorageOrFallback() {
  try {
    const testKey = '__probe__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return localStorage;
  } catch {
    // localStorage недоступен/ограничен (старые браузеры в инкогнито)
    console.warn('Storage недоступен, используем in-memory fallback');
    const memory = new Map();
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, v),
      removeItem: (k) => memory.delete(k)
    };
  }
}
```

### Web Workers для фоновых вычислений

Web Worker выполняет JS в отдельном потоке, не блокируя главный (UI) поток — подходит для тяжёлых вычислений (парсинг, обработка больших массивов, криптография). Обмен данными идёт через `postMessage`/`onmessage`, данные копируются (structured clone), у воркера нет прямого доступа к DOM.

```js
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ cmd: 'calc', data: [1, 2, 3] });
worker.onmessage = (e) => console.log('результат:', e.data);
worker.onerror = (e) => console.error(e.message);

// worker.js
self.onmessage = (e) => {
  const result = e.data.data.reduce((a, b) => a + b, 0);
  self.postMessage(result);
};
```

### Service Workers: push-уведомления, offline режим, фоновая синхронизация

Service Worker — прокси-скрипт между приложением и сетью, работающий в отдельном потоке даже когда вкладка закрыта. Позволяет: перехватывать `fetch` и отдавать закэшированные ответы для offline-режима, получать push-уведомления через `push`-событие (в связке с Push API), выполнять фоновую синхронизацию отложенных действий через Background Sync API, когда соединение восстанавливается.

```js
// Регистрация
navigator.serviceWorker.register('/sw.js');

// sw.js — офлайн через fetch handler
const CACHE_NAME = 'app-cache-v3';

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

```js
// sw.js — push-уведомления
self.addEventListener('push', (e) => {
  const data = e.data.json();
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});
```

### Observer APIs

Семейство асинхронных, неблокирующих API для наблюдения за изменениями без polling: `IntersectionObserver` — видимость элемента относительно viewport/контейнера (ленивая загрузка, infinite scroll), `ResizeObserver` — изменение размеров элемента, `MutationObserver` — изменения DOM-дерева, `PerformanceObserver` — метрики производительности (LCP, CLS и др.).

```js
// IntersectionObserver — видимость элемента относительно viewport/контейнера
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) console.log('элемент виден', entry.intersectionRatio);
  });
}, { threshold: 0.5, rootMargin: '100px' });
io.observe(el);

// ResizeObserver — изменение размеров элемента
const ro = new ResizeObserver((entries) => {
  entries.forEach(entry => console.log(entry.contentRect.width));
});
ro.observe(el);

// PerformanceObserver — метрики производительности
const po = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => console.log(entry.name, entry.duration));
});
po.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
```

### AbortController для отмены запросов по таймауту

`AbortController` создаёт `signal`, который можно передать в `fetch` (и не только) для отмены операции извне. Отменённый запрос выбрасывает `AbortError`, что позволяет отличить отмену от реальной сетевой ошибки. Один и тот же сигнал можно использовать сразу в нескольких местах, включая `addEventListener`, что автоматически снимает обработчик при абортe.

```js
async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Запрос отменён по таймауту');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Отмена нескольких операций одним сигналом
const controller = new AbortController();
btn.addEventListener('click', () => controller.abort(), { signal: controller.signal }); // signal и в addEventListener!
```

### WebSockets и Server-Sent Events для real-time коммуникации

WebSocket — постоянное двунаправленное соединение поверх TCP: и клиент, и сервер могут инициировать отправку сообщений в любой момент; подходит для чатов, игр, совместного редактирования. Server-Sent Events (SSE) — однонаправленный поток от сервера к клиенту поверх обычного HTTP; проще в реализации (нет отдельного протокола), браузер сам переподключается при обрыве, но клиент не может отправлять данные через тот же канал.

```js
// WebSocket — двунаправленный канал
const ws = new WebSocket('wss://example.com/socket');
ws.onopen = () => ws.send(JSON.stringify({ type: 'hello' }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onclose = (e) => console.log('closed', e.code, e.reason);
ws.onerror = (e) => console.error(e);
ws.close(1000, 'нормальное завершение');
```

```js
// Server-Sent Events — однонаправленный поток от сервера к клиенту
const es = new EventSource('/events');
es.onmessage = (e) => console.log(e.data);
es.addEventListener('custom-event', (e) => console.log('custom:', e.data));
es.onerror = () => console.log('переподключение произойдёт автоматически');
```
