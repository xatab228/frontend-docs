# Вёрстка (HTML, CSS) — Middle

### Семантические HTML5-теги (header, nav, main, article, section, aside, footer)

Семантические теги описывают смысл блока, а не только его визуальное поведение: `header`/`footer` — шапка/подвал (документа или секции), `nav` — блок навигации, `main` — уникальный основной контент страницы (один на документ), `article` — самостоятельный, независимо распространяемый контент, `section` — тематический раздел с заголовком, `aside` — второстепенный контент. Это улучшает SEO, доступность (скринридеры используют их как ориентиры) и читаемость кода по сравнению со сплошными `div`.

```html
<body>
  <header><nav aria-label="Основная навигация">...</nav></header>
  <main>
    <article>
      <section><h2>Раздел</h2><p>...</p></section>
      <aside>Похожие материалы</aside>
    </article>
  </main>
  <footer>...</footer>
</body>
```

### SEO-метатеги (title, description, keywords, open graph)

`<title>` — заголовок вкладки и сниппета в поиске (главный SEO-сигнал), `meta name="description"` — краткое описание для сниппета, `keywords` практически не учитывается современными поисковиками. Open Graph теги (`og:title`, `og:description`, `og:image`, `og:url`) управляют превью страницы при шеринге в соцсетях и мессенджерах.

```html
<title>Название страницы — Сайт</title>
<meta name="description" content="Краткое описание страницы для поисковой выдачи">
<meta property="og:title" content="Название страницы">
<meta property="og:image" content="https://site.ru/preview.jpg">
```

### Специфика работы тега link

`<link>` подключает внешние ресурсы: стили (`rel="stylesheet"`), иконки (`rel="icon"`), предзагрузку (`rel="preload"`). Атрибут `as` в `preload` указывает тип ресурса для правильной приоритизации, `crossorigin` нужен для ресурсов с CORS (шрифты требуют его даже с того же домена), `media` позволяет грузить CSS условно (например, только для печати) без блокировки рендеринга.

```html
<link rel="preload" href="critical.css" as="style">
<link rel="stylesheet" href="critical.css">
<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
```

### Способы построения сетки страницы (блочная, flexbox, grid)

Три исторических подхода: блочная модель через `float`/`inline-block` (устарела, требует clearfix), Flexbox — одномерная раскладка вдоль главной оси (идеальна для компонентов, панелей, карточек), Grid — двумерная раскладка с явными строками и колонками (для макета страницы целиком). Выбор зависит от задачи: Grid для общей структуры, Flexbox — для содержимого внутри.

```css
/* Блочная (float/inline-block) — устаревший подход */
.column { float: left; width: 33.33%; }
.clearfix::after { content: ""; display: table; clear: both; }
```
```css
/* Flexbox — одномерная раскладка */
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.item { flex: 1 1 200px; }
```
```css
/* Grid — двумерная раскладка */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
  gap: 20px;
}
.header { grid-area: header; }
```

### Продвинутые навыки CSS и верстки CSS-функции

CSS-функции расширяют возможности статичных значений: `calc()` для смешанных вычислений (`calc(100% - 40px)`), `clamp(min, preferred, max)` для адаптивных значений без медиа-запросов, `min()`/`max()`, цветовые функции `rgb()`/`hsl()`, а также `var()` для чтения CSS-переменных.

```css
.el {
  width: calc(100% - 40px);
  font-size: clamp(14px, 2vw, 20px);
  padding: min(5%, 24px);
}
```

### CSS-переменные

Custom properties (`--name: value`) объявляются обычно в `:root` для глобальной области видимости и читаются через `var(--name, fallback)`. В отличие от препроцессорных переменных, они «живые» — доступны в рантайме через JS и DOM, каскадируются и могут переопределяться в любом селекторе (например, в медиа-запросе для тёмной темы).

```css
:root { --primary-color: #3498db; --spacing: 8px; }
.card { padding: var(--spacing, 8px); color: var(--primary-color); }
```

### CSS-директивы

Директивы (at-rules) начинаются с `@`: `@media` — условные стили, `@import` — подключение файлов, `@font-face` — подключение шрифтов, `@keyframes` — описание анимации, `@supports` — проверка поддержки фичи браузером, `@layer` — управление порядком каскада.

```css
@font-face {
  font-family: "CustomFont";
  src: url("font.woff2") format("woff2");
  font-display: swap;
}
@supports (display: grid) {
  .grid { display: grid; }
}
```

### Медиа-запросы

`@media` применяет блок стилей условно, в зависимости от характеристик устройства: ширины (`min-width`/`max-width`), ориентации, разрешения экрана, предпочтений пользователя (`prefers-color-scheme`, `prefers-reduced-motion`). Основа адаптивной и отзывчивой вёрстки, обычно строится по подходу mobile-first (`min-width`).

```css
@media (max-width: 768px) { .sidebar { display: none; } }
@media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } }
```

### Псевдоэлементы и псевдоселекторы

Псевдоэлементы (`::before`, `::after`, `::first-line`, `::placeholder`) создают/выбирают часть содержимого элемента, не существующую в разметке явно, и требуют `content` для отображения генерируемого контента. Псевдоклассы (в отличие от них) выбирают существующие элементы по состоянию или позиции (`:hover`, `:nth-child()`).

```css
.tooltip::after {
  content: attr(data-text);
  position: absolute;
}
```

### Анимации и трансформации

`transition` анимирует изменение свойства между двумя состояниями (например, при `:hover`), `@keyframes` + `animation` описывают многошаговую анимацию с полным контролем таймингов, повторов и направления. `transform` (translate, scale, rotate, skew) изменяет визуальное представление элемента без влияния на layout соседей — это ключевое для производительности.

```css
.box { transition: transform 0.3s ease-in-out, opacity 0.3s; }
.box:hover { transform: scale(1.1) rotate(5deg); }

@keyframes slide-in {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
.animated {
  animation: slide-in 0.5s ease-out forwards;
  animation-delay: 0.2s;
  animation-iteration-count: infinite;
}
```
```css
.modal {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.modal.is-open { opacity: 1; transform: translateY(0) scale(1); }
```

### Способы и приоритеты подключения CSS

Три способа: внешний файл (`<link>`, кэшируется, рекомендуется), внутренний (`<style>` в `<head>`), инлайновый (атрибут `style`). При равной специфичности побеждает более позднее правило в каскаде, но инлайн-стили имеют более высокий приоритет, чем любые внешние/внутренние селекторы (кроме `!important`).

```html
<link rel="stylesheet" href="styles.css">
<style>.el { color: red; }</style>
<div style="color: red;">...</div>
```

### Вес селекторов и их специфичность

Специфичность считается как тройка (id, классы/атрибуты/псевдоклассы, теги/псевдоэлементы): id весит больше классов, классы — больше тегов. `!important` перебивает обычную специфичность, инлайн-стили весят выше любого селектора кроме `!important`. При равной специфичности побеждает правило, объявленное позже в исходном коде (или каскадный слой с более высоким приоритетом).

### Препроцессоры (SCSS/SASS) (переменные, вложенность, миксины)

Препроцессоры добавляют возможности, которых не было в ванильном CSS долгое время: переменные ($var), вложенность селекторов через `&`, миксины с параметрами (`@mixin`/`@include`), функции, циклы, модули (`@use`). Компилируются в обычный CSS перед отдачей браузеру.

```scss
$primary-color: #3498db;
$spacing: 8px;

.card {
  padding: $spacing * 2;
  border: 1px solid $primary-color;

  &__title { font-size: 18px; }
  &:hover { box-shadow: 0 0 10px rgba(0,0,0,0.2); }
}

@mixin flex-center($direction: row) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: $direction;
}
.header { @include flex-center(column); }

@each $name, $color in (primary: blue, danger: red) {
  .btn-#{$name} { background: $color; }
}
```

### Техники изоляции стилей на основе нейминга классов (BEM, utility CSS, atomic CSS и др.)

BEM (Block__Element--Modifier) даёт предсказуемый плоский нейминг и низкую специфичность, снижая конфликты в больших проектах. Utility/Atomic CSS (Tailwind-подобный подход) идёт от обратного — множество мелких одноцелевых классов прямо в разметке, минимизируя написание кастомного CSS ценой более многословного HTML.

```html
<div class="card card--featured">
  <h3 class="card__title">Заголовок</h3>
  <button class="card__button card__button--disabled">Кнопка</button>
</div>
```
```html
<div class="flex items-center gap-4 p-2 bg-blue-500 text-white rounded-lg">...</div>
```

### Базовое понимание и принципы повышения цифровой доступности

Доступность (a11y) строится на семантической разметке, корректном фокусе для клавиатурной навигации, достаточном цветовом контрасте, альтернативном тексте для изображений и ARIA-атрибутах там, где семантики HTML не хватает (кастомные виджеты). Правило «нативный элемент лучше, чем div + ARIA» — `<button>` уже доступен из коробки.

```html
<button aria-label="Закрыть окно" aria-pressed="false">✕</button>
<div role="alert" aria-live="polite">Сообщение об ошибке</div>
<nav aria-label="Основная навигация"></nav>
```
```html
<button aria-haspopup="listbox" aria-expanded="false" id="select-btn">Выберите город</button>
<ul role="listbox" aria-labelledby="select-btn" hidden>
  <li role="option" aria-selected="false">Москва</li>
  <li role="option" aria-selected="true">Санкт-Петербург</li>
</ul>
```

### Основы работы с SVG (структура, основные элементы, viewBox)

SVG — векторный XML-формат, вставляемый как `<svg>` с фигурами внутри: `rect`, `circle`, `line`, `path`, `text`. `viewBox="minX minY width height"` задаёт внутреннюю систему координат независимо от атрибутов `width`/`height` тега, что позволяет графике масштабироваться без потери качества.

```html
<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="50" fill="steelblue" rx="8"/>
  <circle cx="150" cy="50" r="30" fill="orange" stroke="black" stroke-width="2"/>
  <line x1="0" y1="0" x2="200" y2="100" stroke="gray"/>
  <path d="M10 80 L50 20 L90 80 Z" fill="green"/>
  <text x="10" y="95" font-size="12">Подпись</text>
</svg>
```
