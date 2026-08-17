# Браузерные JS и API — Junior

### Структуру DOM-дерева и отношения между узлами

DOM (Document Object Model) — это объектное представление HTML-документа в виде дерева узлов. Каждый тег, текст и комментарий — узел (`Node`). Узлы связаны отношениями родитель/потомок/сосед: `parentNode`, `childNodes`, `firstChild`, `lastChild`, `previousSibling`, `nextSibling`. Элементы (`Element`) — это подвид узлов, представляющий именно теги; кроме них в дереве есть текстовые узлы (`#text`), узлы комментариев (`#comment`) и корневой узел `document`. Браузер строит DOM из HTML во время парсинга, и именно это дерево — то, с чем работает JS через глобальный объект `document`.

### Методы поиска элементов: getElementById, getElementsByClassName, getElementsByTagName, querySelector, querySelectorAll

```js
document.getElementById('app');                 // ищет по id, только в document, без селектора '#'
document.getElementsByClassName('item');         // HTMLCollection, "живая" коллекция
document.getElementsByTagName('div');             // HTMLCollection, "живая"
document.querySelector('.item.active');           // первый элемент по CSS-селектору
document.querySelectorAll('ul > li:not(.hidden)');// статический NodeList по CSS-селектору
```

`getElementBy*` методы работают быстрее и возвращают "живые" коллекции (автоматически обновляются при изменении DOM), но принимают только простые критерии. `querySelector`/`querySelectorAll` принимают любой CSS-селектор и удобнее в реальных задачах, но `querySelectorAll` возвращает статический `NodeList` — снимок на момент вызова.

### Методы создания и удаления элементов: createElement, append, prepend, remove

```js
// Создание
const card = document.createElement('div');
card.className = 'card';
card.textContent = 'Новая карточка';

// Изменение
card.setAttribute('data-id', '10');
card.classList.add('active');

// Вставка в DOM
document.querySelector('#cards').append(card);

// Удаление
card.remove();
```

`createElement` создаёт элемент вне документа (в памяти), `append`/`prepend` вставляют один или несколько узлов/строк в конец или начало родителя, `remove()` удаляет элемент из DOM без необходимости обращаться к родителю (в отличие от старого `parentNode.removeChild(el)`).

### Методы изменения элементов: setAttribute, getAttribute, removeAttribute

```js
const card = document.querySelector('.card');
card.setAttribute('data-id', '10');       // установить атрибут
console.log(card.getAttribute('data-id')); // прочитать атрибут -> "10"
card.removeAttribute('data-id');           // удалить атрибут
```

Эти методы работают с HTML-атрибутами напрямую (в отличие от свойств DOM-объекта, которые могут отличаться, например `value` у input). Полезны для произвольных атрибутов, включая `data-*`, `aria-*`, `disabled` и т.д.

### Базовые принципы обработки событий: addEventListener и removeEventListener

```js
const btn = document.querySelector('#save-btn');

function onSave() {
  console.log('Сохранено');
}

btn.addEventListener('click', onSave);

// позже, например при размонтировании компонента
btn.removeEventListener('click', onSave);
```

`addEventListener` подписывает функцию-обработчик на событие элемента, позволяя навешивать несколько обработчиков на одно событие. `removeEventListener` снимает обработчик — важно передавать ту же самую ссылку на функцию, что и при подписке (анонимные функции удалить так нельзя).

### Основные события: click, submit, change, input, focus, blur

- `click` — клик по элементу.
- `submit` — отправка формы (срабатывает на `<form>`, не на кнопке).
- `change` — значение поля изменилось и потеряло фокус (для select — сразу при выборе).
- `input` — значение меняется в реальном времени, при каждом вводе символа.
- `focus`/`blur` — элемент получил/потерял фокус; не всплывают (в отличие от `focusin`/`focusout`).

### Разницу между localStorage и sessionStorage хранилищами

`localStorage` хранит данные без срока действия — они остаются после закрытия вкладки и браузера, доступны всем вкладкам одного origin. `sessionStorage` живёт только в рамках одной вкладки/сессии — данные пропадают при закрытии вкладки и не расшариваются между вкладками, даже открытыми на том же сайте. Оба хранилища ограничены объёмом (~5-10 МБ) и работают только со строками синхронно.

### Методы работы с хранилищами: setItem, getItem, clear, removeItem

```js
function saveSettings(settings) {
  localStorage.setItem('settings', JSON.stringify(settings));
}

function loadSettings() {
  const raw = localStorage.getItem('settings');
  return raw ? JSON.parse(raw) : { theme: 'light' };
}

saveSettings({ theme: 'dark', lang: 'ru' });
console.log(loadSettings()); // { theme: 'dark', lang: 'ru' }

localStorage.removeItem('settings'); // удалить один ключ
localStorage.clear();                 // очистить всё хранилище
```

### Основы Fetch API для HTTP-запросов

```js
async function getUsers() {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
  return res.json();
}

async function createUser(user) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
  return res.json();
}
```

`fetch` возвращает промис с объектом `Response`. Важно помнить, что промис не отклоняется при HTTP-ошибках (404, 500) — это нужно проверять вручную через `res.ok`/`res.status`. Тело ответа читается отдельным асинхронным методом (`.json()`, `.text()`, `.blob()`).

### Методы сериализации: JSON.stringify/parse

```js
const user = { id: 1, name: 'Ann', roles: ['admin', 'user'] };

const json = JSON.stringify(user);       // сериализация -> строка
const restored = JSON.parse(json);       // десериализация -> объект

console.log(json, restored);
```

`JSON.stringify` превращает объект/массив в JSON-строку (нужно для отправки в теле запроса, хранения в localStorage). `JSON.parse` делает обратное преобразование. Функции, `undefined`, символы и циклические ссылки при сериализации теряются или вызывают ошибку.

### Console API: log, error, warn

```js
function processOrder(order) {
  console.log('Обработка заказа:', order);
  console.time('processOrder');

  if (!order.items.length) {
    console.warn('Заказ без товаров', order.id);
  }

  try {
    // ... логика
  } catch (e) {
    console.error('Ошибка обработки заказа', e);
  } finally {
    console.timeEnd('processOrder');
  }
}
```

`console.log` — обычный вывод, `console.warn` — предупреждение (жёлтым, для потенциальных проблем), `console.error` — ошибка (красным, с трассировкой стека). Кроме них есть `console.table`, `console.group`, `console.time/timeEnd` для замеров производительности.

### Timer API: setTimeout/setInterval и clearTimeout/clearInterval

```js
// Однократное действие с задержкой
const timeoutId = setTimeout(() => {
  console.log('Показать уведомление');
}, 2000);

// Периодическое действие
const intervalId = setInterval(() => {
  console.log('Проверка новых сообщений');
}, 5000);

// Отмена при необходимости
clearTimeout(timeoutId);
clearInterval(intervalId);
```

`setTimeout` откладывает однократное выполнение функции на заданное время (в мс), `setInterval` — выполняет функцию циклически с указанным интервалом. Оба возвращают идентификатор таймера, который можно передать в `clearTimeout`/`clearInterval` для отмены. Задержка не гарантирует точность — реальное время выполнения зависит от event loop и загруженности главного потока.

---
