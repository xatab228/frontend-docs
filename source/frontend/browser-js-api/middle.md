# Браузерные JS и API — Middle

### DOM-коллекции: HTMLCollection, NodeList и их различия

`HTMLCollection` (результат `getElementsByTagName`, `getElementsByClassName`, `children`) — "живая" коллекция: автоматически обновляется при изменении DOM, содержит только элементы, доступ возможен по индексу и по `id`/`name`. `NodeList` бывает живым (`childNodes`) и статическим (результат `querySelectorAll`) — статический снимок не меняется при последующих изменениях DOM. `NodeList` поддерживает `forEach` из коробки, `HTMLCollection` — нет (её сначала нужно преобразовать через `Array.from` или спред-оператор).

### Методы обхода узлов: children vs childNodes, nextSibling vs nextElementSibling

`children` возвращает только дочерние элементы (`HTMLCollection`), `childNodes` — все узлы, включая текстовые узлы и комментарии (`NodeList`). Аналогично `nextSibling`/`previousSibling` возвращают любой следующий/предыдущий узел (часто это текстовый узел с пробелом), а `nextElementSibling`/`previousElementSibling` — только соседний элемент, пропуская текст и комментарии. На практике для работы с версткой почти всегда нужны именно `*Element*`-варианты.

### Методы вставки HTML элементов: insertAdjacentHTML, insertAdjacentElement с позициями: beforebegin, afterbegin, beforeend, afterend

`insertAdjacentHTML(position, html)` вставляет HTML-разметку (парсится браузером) в указанную позицию относительно элемента без разрушения существующих обработчиков и состояния DOM (в отличие от `innerHTML +=`). `insertAdjacentElement(position, element)` — то же самое, но вставляет уже готовый DOM-узел. Позиции:
- `beforebegin` — перед самим элементом (как его предыдущий сосед);
- `afterbegin` — внутрь элемента, перед первым дочерним;
- `beforeend` — внутрь элемента, после последнего дочернего;
- `afterend` — после самого элемента (как его следующий сосед).

### DocumentFragment для оптимизации вставки элементов

`DocumentFragment` — лёгкий "контейнер" узлов, не являющийся частью реального DOM-дерева. Элементы добавляются в него в памяти, и только затем фрагмент целиком вставляется в документ одной операцией — это даёт один reflow/repaint вместо N при вставке в цикле.

```js
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.name;
  fragment.appendChild(li);
});
list.appendChild(fragment); // одна вставка в реальный DOM
```

### Основные метрики DOM-элементов (offset*, client*, scroll*) для определения размеров, позиций и прокрутки элементов, две системы координат в браузере (относительно окна и документа) и методы для работы с ними

- `offsetWidth`/`offsetHeight` — размер элемента с бордерами и паддингами, `offsetTop`/`offsetLeft` — позиция относительно `offsetParent`.
- `clientWidth`/`clientHeight` — размер без бордеров (только контент + паддинги), `clientTop`/`clientLeft` — толщина бордеров.
- `scrollWidth`/`scrollHeight` — полный размер содержимого, включая невидимую (прокручиваемую) часть; `scrollTop`/`scrollLeft` — текущая позиция прокрутки.

Координаты бывают относительно окна просмотра (viewport) — их даёт `getBoundingClientRect()` (`top`, `left`, `right`, `bottom` от верхнего края видимой области) — и относительно документа (с учётом прокрутки) — вычисляются как `rect.top + window.scrollY`. Ниже пример определения элемента под курсором и позиционирования с учётом обеих систем координат:

```js
// Элемент под курсором
document.addEventListener('click', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  console.log('Под курсором:', el);
});

// Позиционирование тултипа рядом с целевым элементом
function positionTooltip(target, tooltip) {
  const rect = target.getBoundingClientRect();
  tooltip.style.position = 'absolute';
  tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;
}
```

### Фазы событий: capture, target, bubbling

Событие проходит три фазы: capture (сверху вниз, от `document` к целевому элементу), target (непосредственно на элементе-источнике) и bubbling (снизу вверх, обратно к `document`). По умолчанию `addEventListener` слушает bubbling-фазу; чтобы перехватить событие на capture-фазе, передаётся третий аргумент `{ capture: true }`.

```js
const outer = document.querySelector('.outer');
const inner = document.querySelector('.inner');

outer.addEventListener('click', () => console.log('outer: capture'), { capture: true });
inner.addEventListener('click', () => console.log('inner: target/bubble'));
outer.addEventListener('click', () => console.log('outer: bubble'), { capture: false });

// При клике на inner порядок: "outer: capture" -> "inner: target/bubble" -> "outer: bubble"
```

### Делегирование событий и его преимущества

Делегирование — подписка на событие не на каждый отдельный элемент, а на общего родителя, с последующим определением реального источника через `event.target`. Преимущества: один обработчик вместо множества (экономия памяти), обработчик автоматически работает и для элементов, добавленных в DOM позже (динамический контент), проще управлять жизненным циклом подписки.

```js
list.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || !list.contains(li)) return;
  console.log('clicked item:', li.dataset.id);
});
```

### preventDefault и stopPropagation - различия и применение

`preventDefault()` отменяет действие браузера по умолчанию для этого события (переход по ссылке, отправку формы, скролл), но не мешает событию всплывать дальше и не влияет на другие обработчики. `stopPropagation()` останавливает дальнейшее распространение события по дереву (capture/bubbling), но не отменяет действие браузера по умолчанию. Это независимые механизмы, которые часто применяются вместе. `stopImmediatePropagation()` дополнительно блокирует остальные обработчики на том же элементе.

```js
form.addEventListener('submit', (e) => {
  e.preventDefault(); // отменяет действие браузера по умолчанию (отправку формы)
});

child.addEventListener('click', (e) => {
  e.stopPropagation(); // останавливает дальнейшее распространение события по дереву
});

child.addEventListener('click', (e) => {
  e.stopImmediatePropagation(); // + не даст сработать другим обработчикам на ЭТОМ ЖЕ элементе
});
```

### target, currentTarget, relatedTarget - различия между свойствами события

`target` — элемент, на котором событие реально произошло (например, конкретный `<li>`, по которому кликнули). `currentTarget` — элемент, на котором сейчас выполняется обработчик (при делегировании это родитель, на который навешан listener) — актуален только во время выполнения обработчика. `relatedTarget` — "связанный" элемент для некоторых событий, например при `mouseout`/`mouseover` это элемент, откуда/куда перешёл курсор, при `blur`/`focus` — элемент, потерявший/получивший фокус.

### Keyboard events: keydown, keyup, keypress

`keydown` — срабатывает при нажатии клавиши (включая спецклавиши: Ctrl, Escape, стрелки), повторяется при удержании. `keyup` — срабатывает при отпускании клавиши. `keypress` — устаревшее событие, срабатывало только для символьных клавиш, не поддерживает спецклавиши — сейчас не рекомендуется к использованию в пользу `keydown` + проверки `e.key`/`e.code`.

```js
const shortcuts = new Map([
  ['KeyS', () => console.log('Сохранить (Ctrl+S)')],
  ['Escape', () => console.log('Закрыть модалку')]
]);

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.code === 'KeyS') {
    e.preventDefault();
    shortcuts.get('KeyS')();
  } else if (e.key === 'Escape') {
    shortcuts.get('Escape')();
  }
});
```

### Работу с cookies: document.cookie, параметры expires/max-age, path, domain, httpOnly, secure, sameSite

`document.cookie` — строковый интерфейс для чтения и записи cookies текущего документа; запись добавляет/обновляет один cookie, не затирая остальные. Параметры:
- `expires` — абсолютная дата истечения (GMT-строка); `max-age` — время жизни в секундах (приоритетнее `expires`); без них cookie — сессионный.
- `path` — путь, для которого cookie доступен (по умолчанию — путь текущего документа).
- `domain` — домен, которому доступен cookie (позволяет расшарить между поддоменами).
- `httpOnly` — cookie недоступен через JS (`document.cookie`), защита от XSS; выставляется только сервером.
- `secure` — cookie передаётся только по HTTPS.
- `sameSite` — ограничивает отправку cookie при кросс-сайтовых запросах (`Strict`/`Lax`/`None`), защита от CSRF.

```js
function setCookie(name, value, days) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; secure; samesite=strict`;
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

setCookie('theme', 'dark', 30);
console.log(decodeURIComponent(getCookie('theme') ?? ''));
```

### Глобальный обработчик исключений

Браузер предоставляет два глобальных события для отлова необработанных ошибок: `window.onerror`/`window.addEventListener('error', ...)` — для синхронных ошибок в скриптах (и для ошибок загрузки ресурсов, если слушать на capture-фазе), и `unhandledrejection` — для промисов, у которых не был обработан `.catch()`. Это последняя линия защиты, полезная для логирования/мониторинга (Sentry и подобные), но не заменяет try/catch в бизнес-логике.

```js
window.addEventListener('error', (event) => {
  console.error('Ошибка:', event.message, event.filename, event.lineno);
  event.preventDefault(); // подавить вывод в консоль браузера по умолчанию
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанный промис:', event.reason);
});
```

### Fetch API: работа с headers, отправка файлов через FormData

Заголовки задаются через объект `headers` (plain object или `Headers`); при отправке `FormData` заголовок `Content-Type` указывать вручную не нужно — браузер сам проставит `multipart/form-data` с корректным boundary.

```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'avatar');

fetch('/upload', { method: 'POST', body: formData }); 
// Content-Type НЕ указываем вручную — браузер сам выставит multipart/form-data с правильным boundary

fetch('/api', {
  headers: new Headers({ 'Authorization': 'Bearer token', 'Accept': 'application/json' })
});
```

### URL и URLSearchParams API для работы с адресами

`URL` — парсит и собирает адреса, даёт доступ к частям (`protocol`, `host`, `pathname`, `search`, `hash`). `URLSearchParams` — работает с query-параметрами: чтение, добавление, удаление, итерация, без ручного парсинга строки запроса.

```js
const url = new URL('https://example.com/search?q=js&page=2');
console.log(url.pathname, url.searchParams.get('q')); // "/search" "js"

url.searchParams.set('page', '3');
url.searchParams.append('sort', 'asc');
console.log(url.toString()); // https://example.com/search?q=js&page=3&sort=asc
```

### Location API: href, reload и History API: back, forward

`location` управляет текущим адресом: `location.href` — читает/устанавливает полный URL (присвоение вызывает переход), `location.reload()` — перезагружает страницу. `history` управляет историей переходов без перезагрузки: `history.back()`/`history.forward()` — навигация назад/вперёд, а `pushState`/`replaceState` позволяют менять URL и добавлять записи в историю программно (основа роутинга в SPA).

```js
function goToStep(step) {
  history.pushState({ step }, '', `/wizard/${step}`);
  renderStep(step);
}

window.addEventListener('popstate', (e) => {
  const step = e.state?.step ?? 1;
  renderStep(step);
});

function renderStep(step) {
  console.log('Рендерим шаг', step);
}
```

### Clipboard API для работы с буфером обмена

Современный `navigator.clipboard` (асинхронный, промис-based) заменил устаревшую команду `document.execCommand('copy')`. Требует безопасного контекста (HTTPS) и в некоторых браузерах — явного пользовательского жеста (клика) для срабатывания.

```js
document.querySelector('#copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    console.log('Ссылка скопирована');
  } catch (e) {
    console.error('Не удалось скопировать', e);
  }
});
```

---
