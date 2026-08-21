# Вёрстка (HTML, CSS) — Junior

### Cтруктуру HTML-документа

Документ начинается с `<!DOCTYPE html>`, далее корневой тег `<html>` с обязательными детьми `<head>` (метаданные, не отображаются) и `<body>` (видимый контент). Внутри `<head>` располагаются `<meta>`, `<title>`, `<link>`, внутри `<body>` — семантические и обычные теги разметки. Порядок и вложенность важны: браузер строит DOM-дерево именно по этой структуре, и от неё зависит рендеринг и доступность.

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Заголовок страницы</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>Шапка</header>
  <main>Основной контент</main>
  <footer>Подвал</footer>
  <script src="script.js"></script>
</body>
</html>
```

### Основные HTML-теги и их иерархия

HTML-теги делятся на блочные (`div`, `p`, `h1-h6`, `ul`, `li`) и строчные (`span`, `a`, `strong`, `em`), а также на контейнеры и одиночные элементы (`img`, `br`, `input`). Иерархия строится по правилам вложенности: например, `li` может быть только внутри `ul`/`ol`, `td` — внутри `tr`. Неправильная вложенность (например, блочный элемент внутри `p`) браузер может исправить сам, но это ведёт к непредсказуемому DOM.

### Что такое DOCTYPE и зачем он нужен

`<!DOCTYPE html>` — это директива в начале документа, которая указывает браузеру рендерить страницу в стандартном режиме (standards mode) вместо устаревшего quirks mode. Без неё старые правила совместимости могут менять расчёт блочной модели и поведение CSS. Для HTML5 достаточно короткой формы `<!DOCTYPE html>`, в отличие от громоздких DTD-деклараций HTML4/XHTML.

### Что такое метатеги в HTML и их назначение

Метатеги задаются через `<meta>` в `<head>` и описывают документ для браузера, поисковых систем и соцсетей: кодировку (`charset`), область просмотра (`viewport`), описание страницы (`description`), поведение индексации (`robots`). Они не отображаются на странице, но влияют на рендеринг (например, `viewport` управляет масштабом на мобильных) и SEO.

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Основы CSS и верстки Текстовые стили

CSS управляет визуальным представлением: цветом, шрифтами, интервалами. Текстовые свойства (`font-family`, `font-size`, `line-height`, `text-align`, `text-transform`) позволяют настраивать типографику независимо от контента. Каскад и наследование определяют, какое правило в итоге применится к элементу.

```css
.text {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  font-weight: 600;
  font-style: italic;
  line-height: 1.5;
  letter-spacing: 0.02em;
  text-align: center;
  text-decoration: underline;
  text-transform: uppercase;
  color: #333;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
```

### Блочная модель

Каждый элемент — прямоугольный блок, состоящий из `content`, `padding`, `border` и `margin`. По умолчанию (`box-sizing: content-box`) заданные `width`/`height` относятся только к контенту, а `border-box` включает в них padding и border, что удобнее для предсказуемой вёрстки. Понимание модели необходимо для расчёта реальных размеров элемента на странице.

```css
.box {
  box-sizing: border-box;
  width: 300px;
  padding: 20px;
  border: 2px solid #333;
  margin: 10px;
}
```

### Управление цветами и фоном

Цвет задаётся через `color` (текст) и `background-color`/`background-image` (фон), в форматах hex, `rgb()`/`rgba()`, `hsl()`. Фон поддерживает градиенты, изображения и их комбинацию, а также управление позиционированием, повтором и поведением при скролле.

```css
.element {
  color: #333333;
  background-color: rgba(0, 0, 0, 0.5);
  background-image: linear-gradient(to right, #ff7e5f, #feb47b), url("bg.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}
```

### Базовая сетка страницы: нормальный поток, flexbox и grid

Сетка — способ расставить блоки по горизонтали и вертикали. На старте достаточно трёх инструментов:

- **Нормальный поток.** Блочные элементы идут сверху вниз на всю ширину, строчные — слева направо. Отдельная сетка не нужна для простых страниц-документов.
- **Flexbox** (`display: flex`) — раскладка в одну ось: ряд карточек, шапка «логотип слева, меню справа», центрирование.
- **Grid** (`display: grid`) — раскладка сразу по двум осям: каркас страницы, галереи, таблицы карточек.

```css
/* Flexbox: шапка — логотип слева, меню справа, всё по центру по вертикали */
.header {
  display: flex;
  justify-content: space-between; /* распределение по главной оси */
  align-items: center;            /* выравнивание по поперечной оси */
  gap: 16px;
}

/* Flexbox: ряд карточек, которые переносятся на новую строку */
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.card { flex: 1 1 240px; } /* растёт, сжимается, базовая ширина 240px */
```

```css
/* Grid: каркас страницы из именованных областей */
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;  /* фиксированный сайдбар + остальное место */
  grid-template-areas:
    "header header"
    "aside  main"
    "footer footer";
  gap: 16px;
  min-height: 100vh;
}
.layout > header { grid-area: header; }
.layout > aside  { grid-area: aside; }
.layout > main   { grid-area: main; }
.layout > footer { grid-area: footer; }

/* Grid: адаптивная галерея без медиа-запросов */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
```

Как выбрать: если элементы выстраиваются по одной линии (ряд или колонка) — flexbox; если нужно управлять и строками, и колонками одновременно — grid. Их часто комбинируют: grid задаёт каркас страницы, flexbox — внутреннее содержимое блоков.

### Позиционирование

Свойство `position` определяет, как элемент участвует в потоке документа: `static` (по умолчанию), `relative` (смещение от исходного места без выхода из потока), `absolute` (позиционирование относительно ближайшего позиционированного предка), `fixed` (относительно viewport) и `sticky` (гибрид relative/fixed при скролле). Смещения задаются через `top`/`right`/`bottom`/`left`.

### Псевдоклассы

Псевдоклассы (`:hover`, `:focus`, `:active`, `:first-child`, `:nth-child()`, `:not()`) выбирают элементы в зависимости от их состояния или положения в дереве, без добавления дополнительных классов в разметку. Это база для интерактивных стилей и структурных выборок.

### Селекторы (виды, комбинирование)

Базовые виды селекторов: по тегу (`div`), классу (`.card`), id (`#header`), атрибуту (`[type="text"]`), а также универсальный (`*`). Их можно комбинировать: потомок (`.a .b`), прямой потомок (`.a > .b`), соседний (`.a + .b`), последующий (`.a ~ .b`), а также объединять через запятую для группировки правил.
