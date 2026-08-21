# Паттерны разработки — Staff

### GRASP принципы

GRASP (General Responsibility Assignment Software Patterns) — набор принципов распределения ответственности между классами и модулями, дополняющий SOLID:

- **Information Expert** — ответственность поручается классу, у которого есть данные для её выполнения.
- **Creator** — класс A создаёт экземпляры класса B, если A агрегирует, содержит или тесно использует B.
- **Controller** — входная точка системных операций делегируется одному координирующему объекту, а не размазывается по UI.
- **Low Coupling** — минимизировать зависимости между классами, чтобы изменения не каскадировались.
- **High Cohesion** — все обязанности класса тесно связаны с одной ответственностью.
- **Polymorphism** — варианты поведения по типу выражаются полиморфизмом, а не `if/switch` по типу.
- **Pure Fabrication** — если ни один «естественный» доменный класс не подходит, создаётся искусственный класс-сервис ради высокой связности.
- **Indirection** — промежуточный объект вводится, чтобы избежать прямой связанности компонентов.
- **Protected Variations** — нестабильные точки системы изолируются за стабильным интерфейсом.

```ts
// Information Expert: OrderTotalCalculator сам знает состав заказа, ему и поручаем расчёт
class Order {
  constructor(private items: { price: number; qty: number }[]) {}
  getItems() { return this.items; }
}
class OrderTotalCalculator {
  static total(order: Order): number {
    return order.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  }
}

// Pure Fabrication: PriceFormatter не относится к домену, но нужен для связности форматирования
class PriceFormatter {
  static format(amount: number, currency = 'RUB'): string {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount);
  }
}

// Polymorphism вместо if/switch по типу (Protected Variations)
interface ShippingCost { calculate(order: Order): number; }
class StandardShipping implements ShippingCost { calculate() { return 300; } }
class ExpressShipping implements ShippingCost { calculate() { return 900; } }
```

Поиск оптимального сочетания архитектурных решений и качественных стандартов хорошо иллюстрируется совместным применением GRASP, Feature Toggles и DI: `Information Expert`/`Pure Fabrication` определяют, кто считает и кто форматирует цену, DI делает шлюз оплаты заменяемым и тестируемым, а feature-флаг обеспечивает безопасный rollout — все три паттерна работают вместе, не дублируя ответственность друг друга:

```ts
class CheckoutService {
  constructor(
    private readonly gateway: PaymentGateway, // DI
    private readonly flags: FeatureFlags,
  ) {}

  async checkout(order: Order): Promise<string> {
    const total = OrderTotalCalculator.total(order); // Information Expert
    const formatted = PriceFormatter.format(total);  // Pure Fabrication
    if (this.flags.isEnabled('newPaymentFlow')) {
      await this.gateway.charge(total);
    }
    return formatted;
  }
}
```

### Как сочетать ООП и ФП в одном проекте

Смешанный подход обычно строится по принципу: неизменяемые данные и чистые функции для трансформации/бизнес-правил (ФП-ядро без побочных эффектов, легко тестируемое), а объекты и классы — для координации побочных эффектов, работы с внешним миром и управления жизненным циклом (I/O, состояние соединения, кэш) — это соответствует архитектуре "functional core, imperative shell". В React-приложениях это выражается так: компоненты и хуки — объектно-подобная модель с жизненным циклом (ООП-грань), а вычисление производных данных внутри них (селекторы, `useMemo` с чистыми функциями) — ФП-грань. Ключевое правило — не смешивать мутацию состояния и чистые вычисления в одной функции: если функция что-то вычисляет, она не должна параллельно писать в БД или менять глобальное состояние.

```ts
// ФП-ядро: чистые функции бизнес-логики, без побочных эффектов
type CartItem = { id: string; price: number; qty: number };
const calculateTotal = (items: readonly CartItem[]): number =>
  items.reduce((sum, i) => sum + i.price * i.qty, 0);
const applyDiscount = (total: number, percent: number): number => total * (1 - percent / 100);

// императивная оболочка: класс координирует побочные эффекты (сеть, состояние)
class CheckoutController {
  #items: CartItem[] = [];

  addItem(item: CartItem): void {
    this.#items = [...this.#items, item]; // мутация состояния изолирована здесь
  }

  async submit(discountPercent: number): Promise<void> {
    const total = applyDiscount(calculateTotal(this.#items), discountPercent); // чистые вычисления
    await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ total }) }); // побочный эффект
  }
}
```

Опираясь на этот пример, можно проанализировать производительность кода с точки зрения ООП и внести улучшения: типичная проблема — каждое обращение к `calculateTotal` внутри `CheckoutController` пересчитывает сумму с нуля при каждом рендере React-компонента. Решение — мемоизация чистой функции на уровне компонента и профилирование через `React DevTools Profiler`/Chrome Performance:

```ts
function CartSummary({ items }: { items: readonly CartItem[] }) {
  // мемоизация чистой функции ФП-ядра — пересчёт только при реальном изменении items
  const total = useMemo(() => calculateTotal(items), [items]);
  return <div>Итого: {total}</div>;
}
```

Развивая тот же `CheckoutController`/`functional core, imperative shell` дальше — для проектирования масштабируемых и устойчивых систем на смешанном подходе (ООП+ФП) добавляем изоляцию ошибок сети через паттерн Strategy (взаимозаменяемые платёжные шлюзы) поверх чистого ФП-ядра расчёта:

```ts
interface PaymentStrategy { pay(amount: number): Promise<void>; }
class StripeStrategy implements PaymentStrategy {
  async pay(amount: number) { await fetch('/api/stripe', { method: 'POST', body: String(amount) }); }
}
class PaypalStrategy implements PaymentStrategy {
  async pay(amount: number) { await fetch('/api/paypal', { method: 'POST', body: String(amount) }); }
}

class ResilientCheckoutController extends CheckoutController {
  constructor(private strategy: PaymentStrategy) { super(); }
  override async submit(discountPercent: number): Promise<void> {
    const total = applyDiscount(calculateTotal((this as any).items ?? []), discountPercent);
    await this.strategy.pay(total); // ФП-расчёт + заменяемая ООП-стратегия побочного эффекта
  }
}
```

### Лучшие практики сочетания шаблонов в крупных проектах

В крупных проектах паттерны применяют не изолированно, а слоями, соответствующими архитектурным границам: DI/IoC-контейнер связывает всю систему на верхнем уровне, Repository/Factory скрывают источники данных, Strategy/Observer управляют вариативным поведением и событиями внутри доменного слоя, Decorator/Adapter — на границах интеграции с внешними API. Главное правило — не применять паттерн ради паттерна: избыточная абстракция (например, Factory для класса с одним конкретным вариантом) увеличивает когнитивную нагрузку без выгоды, поэтому паттерн вводится только когда реально решает проблему вариативности/связанности/тестируемости, которая уже проявилась или гарантированно появится.

```ts
// пример комбинации: Repository (абстракция доступа к данным) + Factory (выбор реализации)
// + Observer (уведомление подписчиков об изменении) в едином модуле заказов
interface OrderRepository {
  findById(id: string): Promise<Order>;
  save(order: Order): Promise<void>;
}

class OrderRepositoryFactory {
  static create(env: 'test' | 'prod'): OrderRepository {
    return env === 'test' ? new InMemoryOrderRepository() : new RestOrderRepository();
  }
}

class OrderChangeNotifier {
  private listeners: Array<(order: Order) => void> = [];
  subscribe(fn: (order: Order) => void) { this.listeners.push(fn); }
  notify(order: Order) { this.listeners.forEach((fn) => fn(order)); }
}
```

### Последние исследования и нововведения в области проектирования программного обеспечения

Актуальные направления последних лет: сигнальные (signal-based) реактивные модели состояния (Angular Signals, Vue reactivity, Preact/Solid signals, экспериментальные React Signals) как альтернатива virtual DOM diffing — они дают более тонкогранулярные обновления UI без полного повторного рендера дерева. Растёт применение Server Components/RSC-архитектуры, где часть UI-логики сознательно смещается на сервер, что переопределяет традиционные границы MVC во frontend. В области типизации усиливается интерес к "type-driven design" — типы как источник истины для валидации и генерации кода (например, генерация Zod-схем и OpenAPI спецификаций из TypeScript-типов и обратно). Также заметен возврат интереса к архитектурам на основе event sourcing/CQRS для сложных frontend-состояний (сложные редакторы, коллаборативные приложения), где важна история изменений и возможность undo/redo.

```ts
// сигнальная модель состояния (пример на уровне идеи, аналог Solid/Preact Signals)
function createSignal<T>(initial: T) {
  let value = initial;
  const subscribers = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => { value = next; subscribers.forEach((fn) => fn()); },
    subscribe: (fn: () => void) => subscribers.add(fn),
  };
}

const count = createSignal(0);
count.subscribe(() => console.log('count changed:', count.get())); // точечное обновление, без ре-рендера всего дерева
count.set(1);
```
