# Паттерны разработки — Senior

### Плюсы и минусы ООП vs ФП

ООП группирует данные и поведение вокруг объектов и хорошо моделирует предметную область с изменяемым состоянием и сложными иерархиями сущностей (например, UI-компоненты с жизненным циклом), но изменяемое состояние, разбросанное по множеству объектов, усложняет рассуждение о программе, повышает риск побочных эффектов и затрудняет параллелизм. ФП строится вокруг чистых функций и неизменяемых данных, что даёт более предсказуемое поведение, упрощает тестирование (нет скрытого состояния) и параллельное выполнение (нет гонок за общими мутируемыми данными), но может быть менее интуитивным для моделирования сущностей с богатым жизненным циклом и иногда приводит к менее эффективному использованию памяти из-за постоянного создания новых объектов вместо мутации существующих. На практике фронтенд-стек обычно смешивает оба подхода: React-компоненты организованы как объекты/функции с состоянием (ООП-подобная модель жизненного цикла), а обработка данных внутри них (`map`/`filter`/`reduce`, селекторы Redux) — в ФП-стиле.

```ts
// ООП: мутация состояния внутри объекта, требует явной синхронизации
class ShoppingCart {
  private items: { id: number; price: number }[] = [];
  addItem(item: { id: number; price: number }): void {
    this.items.push(item); // мутация — риск гонки при параллельном доступе
  }
  total(): number {
    return this.items.reduce((sum, i) => sum + i.price, 0);
  }
}

// ФП: неизменяемые данные, каждое действие возвращает новое состояние
type CartState = readonly { id: number; price: number }[];
const addItem = (cart: CartState, item: { id: number; price: number }): CartState => [...cart, item];
const total = (cart: CartState): number => cart.reduce((sum, i) => sum + i.price, 0);
```

### Основные функции ФП (pure functions, immutability, higher-order functions, functions composition, рекурсия, мемоизация)

Чистая функция (pure function) — при одинаковых входных данных всегда возвращает одинаковый результат и не производит побочных эффектов (не мутирует внешнее состояние, не делает I/O). Иммутабельность — данные после создания не изменяются; вместо мутации создаётся новая копия с изменёнными полями, что упрощает отслеживание изменений (важно для `React.memo`/сравнения по ссылке). Функция высшего порядка (higher-order function) принимает функцию как аргумент и/или возвращает функцию — на этом строятся `map`/`filter`/`reduce` и HOC в React. Композиция функций — объединение нескольких простых функций в одну сложную путём последовательного применения (`f(g(x))`). Рекурсия — функция вызывает сама себя для решения задачи через более простые подзадачи. Мемоизация — кэширование результата "дорогого" вызова функции по её аргументам, чтобы не пересчитывать его повторно.

```ts
// чистая функция + иммутабельность
const applyDiscount = (price: number, percent: number): number => price * (1 - percent / 100);

// функция высшего порядка
const withLogging = <A extends unknown[], R>(fn: (...args: A) => R) =>
  (...args: A): R => {
    console.log('call', fn.name, args);
    return fn(...args);
  };

// композиция функций
const compose = <T>(...fns: Array<(x: T) => T>) => (x: T): T => fns.reduceRight((acc, fn) => fn(acc), x);
const process = compose(
  (n: number) => n + 1,
  (n: number) => n * 2,
);
process(5); // (5 * 2) + 1 = 11

// рекурсия
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

// мемоизация
function memoize<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const cache = new Map<string, R>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key)!;
  };
}
const expensiveCalc = memoize((n: number) => { /* тяжёлые вычисления */ return n ** 2; });
```

### Подробности работы распространённых шаблонов проектирования GoF, их плюсы и минусы

Паттерны GoF делятся на три группы. Порождающие (creational) — Singleton, Factory Method, Abstract Factory, Builder, Prototype — управляют созданием объектов; плюс — гибкость и изоляция логики создания, минус — Singleton легко превращается в антипаттерн (глобальное скрытое состояние, усложняет тесты). Структурные (structural) — Adapter, Decorator, Facade, Proxy, Composite — управляют композицией объектов; плюс — переиспользование без изменения существующего кода (Decorator расширяет поведение без наследования), минус — избыточная многослойность оборачивания может усложнить отладку. Поведенческие (behavioral) — Observer, Strategy, Command, State, Chain of Responsibility — управляют взаимодействием между объектами; плюс — гибкая замена алгоритмов/поведения в рантайме (Strategy), минус — рост числа мелких классов/объектов может усложнить навигацию по коду.

```ts
// Decorator (структурный): расширение поведения fetch-запроса без изменения исходной функции
type Fetcher = (url: string) => Promise<Response>;

const withRetry = (fetcher: Fetcher, retries = 3): Fetcher => async (url) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetcher(url);
    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
  throw new Error('unreachable');
};

const withTimeout = (fetcher: Fetcher, ms: number): Fetcher => (url) =>
  Promise.race([
    fetcher(url),
    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

const resilientFetch = withTimeout(withRetry(fetch, 3), 5000);

// Strategy (поведенческий): подмена алгоритма сортировки в рантайме
interface SortStrategy<T> { sort(items: T[]): T[]; }
class QuickSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { return [...items].sort(); }
}
class Sorter<T> {
  constructor(private strategy: SortStrategy<T>) {}
  setStrategy(strategy: SortStrategy<T>): void { this.strategy = strategy; }
  sort(items: T[]): T[] { return this.strategy.sort(items); }
}
```

Эффективное управление общими компонентами требует баланса между переиспользованием и сложностью. Так, вместо создания одного "супер-хука", решающего сразу retry+timeout+caching+logging (что усложняет API для всех потребителей), лучше компоновать узкие переиспользуемые декораторы под конкретный случай — баланс достигается тем, что каждый уровень декорирования независим и подключается только там, где нужен:

```ts
// узкий, простой в использовании кейс — обычный запрос без доп. поведения
const simpleFetch = fetch;

// сложный кейс — только там, где действительно нужна отказоустойчивость
const criticalPaymentFetch = withTimeout(withRetry(fetch, 5), 3000);
```

### Паттерн конфигурации Feature Toggles

Feature Toggle (feature flag) — механизм, позволяющий включать и выключать функциональность приложения без деплоя нового кода, обычно через конфигурацию, которая читается в рантайме (из удалённого сервиса, БД или переменных окружения). Основные виды: release toggles (постепенный rollout незавершённой функциональности), experiment toggles (A/B-тестирование), ops toggles (аварийное отключение проблемной функции без отката релиза), permission toggles (доступ по ролям/подписке). Ключевое архитектурное требование — изолировать логику проверки флага от бизнес-логики, чтобы код не покрывался if-ами по всему приложению, и удалять устаревшие флаги, иначе кодовая база деградирует до неподдерживаемого состояния.

```ts
interface FeatureFlags {
  isEnabled(flagKey: string, context?: { userId?: string }): boolean;
}

class RemoteFeatureFlags implements FeatureFlags {
  constructor(private flags: Record<string, boolean | ((ctx: any) => boolean)>) {}
  isEnabled(flagKey: string, context?: { userId?: string }): boolean {
    const rule = this.flags[flagKey];
    return typeof rule === 'function' ? rule(context) : Boolean(rule);
  }
}

const flags = new RemoteFeatureFlags({
  newCheckout: (ctx) => ctx?.userId?.endsWith('0'), // 10% rollout по хэшу id
  darkMode: true,
});

// использование в компоненте — логика фичи изолирована от if-ов
function CheckoutPage({ userId }: { userId: string }) {
  return flags.isEnabled('newCheckout', { userId }) ? <NewCheckout /> : <LegacyCheckout />;
}
```

На практике feature toggles внедряются для безопасных релизов и A/B-тестирования: новая логика выкатывается за ops-флагом, который можно мгновенно выключить без отката деплоя, если в продакшене обнаружится проблема (например, по алертам из Sentry/Grafana):

```ts
function checkout(userId: string, cart: Cart) {
  if (flags.isEnabled('newCheckout', { userId })) {
    try {
      return runNewCheckoutFlow(cart);
    } catch (err) {
      reportToSentry(err);
      return runLegacyCheckoutFlow(cart); // fallback, пока флаг не выключен вручную
    }
  }
  return runLegacyCheckoutFlow(cart);
}
```

### Минимизировать зависимости между компонентами, использовать IoC и DI для облегчения тестирования и поддержки

Развивая пример DI из middle.md (`OrderService`/`PaymentGateway`) — здесь показываем, как DI напрямую упрощает unit-тестирование за счёт подмены зависимости моком, без обращения к реальной сети:

```ts
interface PaymentGateway { charge(amount: number): Promise<void>; }

class OrderService {
  constructor(private readonly gateway: PaymentGateway) {}
  async checkout(amount: number): Promise<'ok' | 'failed'> {
    try {
      await this.gateway.charge(amount);
      return 'ok';
    } catch {
      return 'failed';
    }
  }
}

// тест: подмена зависимости мок-объектом, никакой реальной оплаты
test('checkout возвращает failed при ошибке шлюза', async () => {
  const failingGateway: PaymentGateway = { charge: () => Promise.reject(new Error('declined')) };
  const service = new OrderService(failingGateway);
  await expect(service.checkout(100)).resolves.toBe('failed');
});
```
