# Вёрстка (HTML, CSS) — Senior

### Теги для работы со встроенным контентом (видео, аудио, изображение)

`<img>` выводит растровое изображение, `<picture>` позволяет отдавать разные форматы/размеры через `<source>` в зависимости от поддержки браузера и характеристик экрана, `<video>`/`<audio>` — нативное медиа с несколькими источниками (`<source>`) для fallback по формату и субтитрами через `<track>`. Атрибуты `loading="lazy"`, `width`/`height`, `preload` и `poster` управляют производительностью и UX загрузки.

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Описание" loading="lazy" width="800" height="600">
</picture>

<video controls poster="preview.jpg" preload="metadata" width="640" height="360">
  <source src="video.webm" type="video/webm">
  <source src="video.mp4" type="video/mp4">
  <track kind="subtitles" src="subs.ru.vtt" srclang="ru" label="Русский" default>
</video>

<audio controls>
  <source src="audio.ogg" type="audio/ogg">
  <source src="audio.mp3" type="audio/mpeg">
</audio>
```

### Принципы оптимизации анимаций (translate3d, will-change)

Браузер дешевле всего анимирует свойства, влияющие только на этап compositing (`transform`, `opacity`) — они не вызывают layout/paint всего документа. `translate3d`/`scale3d` форсируют создание отдельного composite-слоя на GPU, а `will-change` заранее предупреждает браузер о готовящемся изменении, но его нужно снимать после анимации (иначе лишние слои съедают память).

```css
/* Было — вызывает layout на каждый кадр */
.bad { transition: left 0.3s, width 0.3s; }

/* Стало — только composite */
.good {
  transition: transform 0.3s, opacity 0.3s;
  will-change: transform;
}
```
```css
.optimized {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}
```

### О существовании XPath селекторов (для автотестов)

XPath — язык запросов по XML/HTML-дереву, альтернативный CSS-селекторам, умеющий то, чего CSS не может: выбор по текстовому содержимому (`//button[text()="Купить"]`), навигацию к родителю (`//div/parent::*`) и сложные условные выражения. В автотестах (Selenium, отчасти Playwright) XPath используют, когда элемент невозможно однозначно выбрать по классам/атрибутам.

### Постпроцессоры, отличие от препроцессоров

Препроцессор (SCSS/Less) компилирует свой собственный расширенный синтаксис в обычный CSS до того, как браузер его увидит — работает с исходным кодом, которого без компиляции не существует. Постпроцессор (PostCSS) трансформирует уже валидный (или почти валидный) CSS через плагины: добавляет вендорные префиксы (`autoprefixer`), минифицирует (`cssnano`), позволяет использовать завтрашние CSS-фичи уже сегодня (`postcss-preset-env`). Часто оба используются вместе: SCSS → CSS → PostCSS-пайплайн.

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('postcss-preset-env'),
    require('cssnano'),
  ],
};
```
```css
/* до postcss-preset-env */
.el { color: rgb(255 0 0 / 50%); }

/* Autoprefixer добавит: */
.el { display: -webkit-flex; display: flex; }
```

### Canvas API для создания 2D графики (общее понимание)

`<canvas>` — растровая область рисования, управляемая императивно через JS-контекст `getContext('2d')`: методы вроде `fillRect`, `arc`, `stroke` рисуют пиксели напрямую, без сохранения объектной модели фигур (в отличие от SVG, где каждая фигура — узел DOM). Подходит для динамичной графики с большим числом объектов (игры, визуализации), где DOM-манипуляции были бы слишком дорогими.

```html
<canvas id="canvas" width="400" height="200"></canvas>
<script>
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3498db';
  ctx.fillRect(10, 10, 100, 50);

  ctx.beginPath();
  ctx.arc(200, 100, 40, 0, Math.PI * 2);
  ctx.fillStyle = 'orange';
  ctx.fill();
</script>
```

### WebGL и шейдеры для создания 3D-графики (общее понимание)

WebGL — низкоуровневый JS-API поверх OpenGL ES для рендеринга через GPU, работающий с шейдерами — небольшими программами на GLSL, выполняющимися параллельно на видеокарте. Vertex shader вычисляет позицию каждой вершины, fragment shader — итоговый цвет каждого пикселя. На практике сырой WebGL используют редко, чаще библиотеки поверх него (Three.js).

```js
const gl = canvas.getContext('webgl2');
```
```glsl
// Vertex shader
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
```glsl
// Fragment shader
precision mediump float;
uniform vec3 color;
void main() {
  gl_FragColor = vec4(color, 1.0);
}
```

### Принципы создания анимаций с помощью requestAnimationFrame

`requestAnimationFrame` планирует выполнение колбэка перед следующей перерисовкой браузера (обычно ~60 раз в секунду), синхронизируясь с частотой обновления экрана — в отличие от `setTimeout`/`setInterval`, которые не привязаны к rendering pipeline и могут вызывать дёрганую анимацию. Колбэк должен сам себя рекурсивно переназначать для непрерывной анимации, а вычисления стоит делать на основе переданного timestamp, а не фиксированного шага.

```js
const ctx = canvas.getContext('2d');
function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#e74c3c';
  ctx.fill();
  x += vx; y += vy;
  requestAnimationFrame(drawFrame);
}
```

### Основные API веб-компонентов (Custom Elements, HTML Templates) и их преимущества и ограничения

Custom Elements позволяют регистрировать собственные HTML-теги с поведением через `customElements.define`, HTML Templates (`<template>`) — декларативно описывать разметку, которая не рендерится и не парсит вложенные ресурсы, пока не будет клонирована в DOM через JS. Преимущества — инкапсуляция и переиспользуемость без фреймворка; ограничения — отсутствие полноценного реактивного связывания данных «из коробки» и более многословный императивный код по сравнению с React/Vue.

```js
class MyCounter extends HTMLElement {
  constructor() { super(); this.count = 0; }
  connectedCallback() {
    this.innerHTML = `<button>Count: ${this.count}</button>`;
    this.querySelector('button').addEventListener('click', () => {
      this.count++;
      this.querySelector('button').textContent = `Count: ${this.count}`;
    });
  }
}
customElements.define('my-counter', MyCounter);
```
```html
<template id="row-template">
  <tr><td class="name"></td><td class="price"></td></tr>
</template>
<script>
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.name').textContent = item.name;
    fragment.appendChild(clone);
  });
  tbody.appendChild(fragment); // один reflow вместо N
</script>
```

### Жизненный цикл Custom Elements (connectedCallback, disconnectedCallback, attributeChangedCallback)

`constructor` вызывается при создании элемента, но без доступа к атрибутам и детям (элемент ещё не в DOM). `connectedCallback` срабатывает при вставке в документ (может вызываться повторно при переносе) — здесь обычно рендерят содержимое и вешают обработчики. `disconnectedCallback` — при удалении из DOM, место для очистки подписок и таймеров. `attributeChangedCallback` вызывается при изменении атрибута, перечисленного в статическом `observedAttributes`.

```js
class UserCard extends HTMLElement {
  static get observedAttributes() { return ['name']; }
  connectedCallback() { this.render(); }
  disconnectedCallback() { this.cleanup(); }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'name' && oldValue !== newValue) this.render();
  }
  render() { this.textContent = `Пользователь: ${this.getAttribute('name')}`; }
}
customElements.define('user-card', UserCard);
```

### Способы стилизации веб-компонентов (::part, CSS custom properties)

Shadow DOM инкапсулирует стили компонента, изолируя их от внешней страницы, но это же мешает кастомизации снаружи. Два официальных «пробоя» изоляции: CSS custom properties (`var(--x)`) свободно проникают через границу Shadow DOM и позволяют настраивать переменные снаружи; `::part()` даёт точечный доступ снаружи к конкретному внутреннему элементу, если автор компонента явно пометил его атрибутом `part`.

```js
class MyButton extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        button {
          background: var(--btn-bg, #3498db);
          color: var(--btn-color, white);
          padding: var(--btn-padding, 8px 16px);
        }
      </style>
      <button part="button"><slot></slot></button>
    `;
  }
}
customElements.define('my-button', MyButton);
```
```css
my-button {
  --btn-bg: crimson;
  --btn-padding: 12px 24px;
}
my-button::part(button) {
  border-radius: 999px;
  text-transform: uppercase;
}
```

### Базовые паттерны использования слотов для композиции компонентов

`<slot>` внутри Shadow DOM определяет точку, куда попадает light DOM содержимое компонента (то, что пользователь пишет между открывающим и закрывающим тегом кастомного элемента). Именованные слоты (`<slot name="...">` + атрибут `slot="..."` у потомка) позволяют распределять контент по нескольким зонам компонента, реализуя паттерн композиции, похожий на `children`/`props.slot` во фреймворках.

```js
shadow.innerHTML = `<button part="button"><slot></slot></button>`;
```
```html
<my-button>Нажми меня</my-button> <!-- текст попадёт в <slot> -->
```
