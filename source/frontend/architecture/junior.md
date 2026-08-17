# Архитектура Web приложений — Junior

### Что такое компонент

Компонент — независимая, переиспользуемая единица UI, инкапсулирующая разметку, поведение и часто стили. У него есть свой интерфейс (props/inputs), выход (события/callbacks, рендер), опционально внутреннее состояние и жизненный цикл (mount/update/unmount). Компонентный подход позволяет разбивать сложный интерфейс на изолированные части по границам ответственности и переиспользования, что упрощает поддержку и тестирование.

Пример — карточка товара до и после выделения компонентов:

```jsx
// До: всё в одном месте
function ProductPage({ product }) {
  return (
    <div>
      <img src={product.image} />
      <h2>{product.title}</h2>
      <span>{product.price} ₽</span>
      <button onClick={() => addToCart(product.id)}>В корзину</button>
    </div>
  );
}

// После: выделены переиспользуемые компоненты
function ProductPage({ product }) {
  return (
    <ProductCard>
      <ProductImage src={product.image} alt={product.title} />
      <ProductTitle>{product.title}</ProductTitle>
      <Price value={product.price} />
      <AddToCartButton productId={product.id} />
    </ProductCard>
  );
}
```

### Что такое атомарный дизайн

Atomic Design (Brad Frost) — методология структурирования UI-компонентов по аналогии с химией: от простейших "атомов" до целых "страниц". Пять уровней: **Atoms** (кнопка, инпут, лейбл, иконка — неделимые базовые элементы), **Molecules** (простые группы атомов, работающие как единое целое: поле поиска), **Organisms** (сложные самостоятельные блоки: хедер сайта), **Templates** (скелеты страниц без реального контента) и **Pages** (шаблоны, наполненные реальными данными). Такой подход даёт единый словарь для команды и системный UI-кит.

```
Atoms → Molecules → Organisms → Templates → Pages
(кнопка) (search-bar) (header)   (layout)   (HomePage)
```

Пример — сборка молекулы `SearchBar` из атомов `Input` и `Button`:

```jsx
// atoms/Input.jsx
function Input(props) {
  return <input className="atom-input" {...props} />;
}

// atoms/Button.jsx
function Button({ children, ...props }) {
  return <button className="atom-button" {...props}>{children}</button>;
}

// molecules/SearchBar.jsx — молекула = композиция атомов + минимальная своя логика
function SearchBar({ onSearch }) {
  const [value, setValue] = useState('');
  return (
    <div className="molecule-search-bar">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Поиск..." />
      <Button onClick={() => onSearch(value)}>Найти</Button>
    </div>
  );
}
```

### Принцип CSR (Client-Side Rendering)

При CSR браузер получает почти пустой HTML и JS-бандл; весь рендеринг DOM происходит на клиенте после загрузки и выполнения JavaScript. Плюсы: простая инфраструктура (статический хостинг/CDN), богатая интерактивность после загрузки, меньше нагрузки на сервер. Минусы: медленный первый значимый рендер (FCP/LCP), слабое SEO без дополнительных мер, зависимость от производительности устройства пользователя. CSR хорошо подходит для внутренних приложений и админок, где SEO не важен.

```jsx
// app/dashboard/page.tsx
'use client'; // рендер полностью на клиенте
export default function Dashboard() {
  const { data } = useSWR('/api/stats', fetcher);
  return <StatsPanel data={data} />;
}
```

### Что такое локальное состояние и кеширование

**Локальное состояние (local state)** — данные, которые принадлежат конкретному компоненту и не видны/не нужны остальному приложению (например, `useState` для открытого/закрытого состояния дропдауна). **Кеширование** — сохранение результата вычисления/запроса, чтобы не повторять дорогостоящую операцию снова: кеш HTTP-запросов (React Query/SWR хранят результат по ключу и переиспользуют его, пока не истечёт TTL), мемоизация вычислений (`useMemo`, `useCallback`), кеш браузера (HTTP-кеш, Service Worker, localStorage).

```jsx
function ProductDetails({ id }) {
  // Локальное UI-состояние — изолировано внутри компонента
  const [isFavorite, setIsFavorite] = useState(false);

  // Кешируемый серверный запрос: результат хранится по ключу ['product', id],
  // повторный рендер/переход не делает новый запрос, пока данные не устареют
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    staleTime: 60_000,
  });

  if (isLoading) return <Spinner />;
  return (
    <div>
      <h2>{product.title}</h2>
      <button onClick={() => setIsFavorite((f) => !f)}>
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  );
}
```

### Базовые принципы чистоты кода и почему важна структура

Чистый код — понятные имена, маленькие функции с одной ответственностью, отсутствие дублирования (DRY), предсказуемая структура папок/файлов, минимум побочных эффектов и явные зависимости. Важность структуры в том, что она снижает когнитивную нагрузку при навигации по проекту: новый разработчик должен уметь найти нужный файл по логике именования, а не по памяти. Плохая структура — первый шаг к "большому кому грязи" (см. вопрос уровня Middle), когда изменения в одном месте непредсказуемо ломают другие части приложения. Хорошая структура поддерживает масштабирование команды и кода без постоянных переписываний.
