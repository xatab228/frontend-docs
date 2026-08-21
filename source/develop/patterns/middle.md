# Паттерны разработки — Middle

### Продвинутые техники ООП (abstract classes, interfaces)

Абстрактные классы позволяют описать общий контракт и частично общую реализацию для семейства наследников, но сами не могут быть инстанцированы напрямую — они задают "что должно быть", оставляя часть методов нереализованными (`abstract`). Интерфейсы, в отличие от абстрактных классов, описывают только форму (набор полей и сигнатур методов) без какой-либо реализации, и класс может реализовывать сразу несколько интерфейсов, тогда как наследоваться в TypeScript/JS можно только от одного класса. Абстрактный класс уместен, когда у наследников есть общий переиспользуемый код; интерфейс — когда важен только контракт, а реализации могут быть совершенно разными (например, для подмены зависимости в тестах).

```ts
interface Logger {
  log(message: string): void;
}

interface Serializable {
  toJSON(): Record<string, unknown>;
}

// класс может реализовать сразу два интерфейса
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

abstract class HttpClientBase {
  protected constructor(protected baseUrl: string) {}

  // общая реализация, переиспользуется всеми наследниками
  protected buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // контракт, который обязаны реализовать наследники
  abstract get<T>(path: string): Promise<T>;
}

class FetchHttpClient extends HttpClientBase {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(this.buildUrl(path));
    return res.json() as Promise<T>;
  }
}
```

На практике эти инструменты применяются при проектировании объектно-ориентированных структур данных: возьмём очередь задач с приоритетом, спроектированную с использованием инкапсуляции и явного интерфейса:

```ts
interface Task {
  id: string;
  priority: number;
  run(): Promise<void>;
}

class PriorityTaskQueue {
  #tasks: Task[] = [];

  enqueue(task: Task): void {
    this.#tasks.push(task);
    this.#tasks.sort((a, b) => b.priority - a.priority);
  }

  async runNext(): Promise<void> {
    const task = this.#tasks.shift();
    if (task) await task.run();
  }

  get size(): number {
    return this.#tasks.length;
  }
}
```

### Принципы Inversion of Control (IoC), Dependency Injection (DI) и Dependency Lookup

Инверсия управления (IoC) — общий принцип, согласно которому объект не сам создаёт и ищет свои зависимости, а получает их извне, что переворачивает традиционный поток управления. Dependency Injection — конкретная реализация IoC, при которой зависимости передаются объекту явно (через конструктор, свойство или функцию) кем-то извне (контейнером или родительским кодом). Dependency Lookup — альтернативная реализация IoC, при которой объект сам активно запрашивает зависимость у некоего реестра/сервис-локатора по имени или типу, что менее явно и хуже тестируется, чем DI, поскольку скрывает реальные зависимости внутри кода. DI предпочтительнее, так как зависимости видны в сигнатуре конструктора, а значит их легко подменить моками в тестах.

```ts
interface PaymentGateway {
  charge(amount: number): Promise<void>;
}

// Dependency Injection: зависимость передаётся через конструктор
class OrderService {
  constructor(private readonly gateway: PaymentGateway) {}

  async checkout(amount: number): Promise<void> {
    await this.gateway.charge(amount);
  }
}

// в продакшене — реальный шлюз, в тестах — мок; OrderService об этом не знает
const service = new OrderService(new StripeGateway());

// Dependency Lookup для сравнения: сервис сам достаёт зависимость из реестра
class ServiceLocator {
  static get<T>(key: string): T {
    return registry[key] as T; // скрытая зависимость, сложнее подменить в тестах
  }
}
class LegacyOrderService {
  checkout(amount: number) {
    const gateway = ServiceLocator.get<PaymentGateway>('paymentGateway');
    return gateway.charge(amount);
  }
}
```

### Понятия лямбда-функций и каррирования

Лямбда-функция (в JS/TS — стрелочная функция) — это анонимная функция, которую можно определить "на месте" и передать как значение, обычно с более коротким синтаксисом и лексическим связыванием `this`. Каррирование — трансформация функции с несколькими аргументами в последовательность функций, каждая из которых принимает один аргумент и возвращает следующую функцию, пока не будут собраны все аргументы для итогового вычисления. Каррирование полезно для частичного применения — заранее зафиксировать часть аргументов и получить переиспользуемую специализированную функцию.

```ts
// лямбда
const double = (x: number): number => x * 2;

// каррированная функция
const multiply = (a: number) => (b: number) => a * b;

const double2 = multiply(2); // частично применённая функция
console.log(double2(5)); // 10

// практический пример: каррированный валидатор для форм
const minLength = (min: number) => (value: string) => value.length >= min || `Минимум ${min} символов`;
const passwordRule = minLength(8);
console.log(passwordRule('123')); // "Минимум 8 символов"
```

### Принципы SOLID, DRY, KISS, YAGNI может расшифровать и объяснить назначение каждого из них

SOLID — набор из пяти принципов ООП-дизайна:

- **S**ingle Responsibility — у класса должна быть одна причина для изменения.
- **O**pen/Closed — код открыт для расширения, но закрыт для модификации: новую функциональность добавляют новыми классами, а не правками существующих.
- **L**iskov Substitution — объект подкласса должен быть взаимозаменяем с объектом базового класса без нарушения корректности программы.
- **I**nterface Segregation — лучше несколько узких интерфейсов, чем один «толстый».
- **D**ependency Inversion — зависеть нужно от абстракций, а не от конкретных реализаций.

Три коротких принципа рядом с ними задают меру:

- **DRY** (Don't Repeat Yourself) — не дублировать логику, выносить повторяющийся код в переиспользуемые функции и модули.
- **KISS** (Keep It Simple, Stupid) — предпочитать простое решение сложному, если оно решает задачу не хуже.
- **YAGNI** (You Aren't Gonna Need It) — не добавлять функциональность «про запас», пока она реально не понадобилась.

```ts
// нарушение SRP и OCP: один класс и считает скидку, и знает обо всех типах пользователей
class BadDiscount {
  calculate(userType: string, price: number): number {
    if (userType === 'vip') return price * 0.8;
    if (userType === 'regular') return price * 0.95;
    return price;
  }
}

// соблюдение OCP и DIP: новый тип скидки добавляется новым классом, а не правкой старого
interface DiscountStrategy {
  apply(price: number): number;
}
class VipDiscount implements DiscountStrategy {
  apply(price: number): number { return price * 0.8; }
}
class RegularDiscount implements DiscountStrategy {
  apply(price: number): number { return price * 0.95; }
}
class PriceCalculator {
  constructor(private strategy: DiscountStrategy) {}
  calculate(price: number): number {
    return this.strategy.apply(price);
  }
}
```

Применение этих принципов на практике хорошо видно и на устранении дублирования логики валидации форм (DRY):

```ts
// нарушение DRY: одинаковая логика повторяется
function validateEmail(value: string) {
  if (!value) return 'Обязательное поле';
  if (!/^\S+@\S+$/.test(value)) return 'Неверный формат';
}
function validatePhone(value: string) {
  if (!value) return 'Обязательное поле';
  if (!/^\+\d{10,15}$/.test(value)) return 'Неверный формат';
}

// DRY: общая часть вынесена в комбинатор валидаторов
const required = (value: string) => (!value ? 'Обязательное поле' : undefined);
const pattern = (regex: RegExp) => (value: string) => (!regex.test(value) ? 'Неверный формат' : undefined);

const validate = (value: string, rules: Array<(v: string) => string | undefined>) =>
  rules.reduce<string | undefined>((error, rule) => error ?? rule(value), undefined);

validate('test@mail.com', [required, pattern(/^\S+@\S+$/)]);
```

### Подходы проектирования (TDD, BDD, API First, Code first), их отличия и области применения

**TDD (Test-Driven Development)** — разработка начинается с падающего теста, затем пишется минимальный код, чтобы тест прошёл, затем код рефакторится (цикл red-green-refactor). Фокус — на корректности реализации через юнит-тесты.

**BDD (Behavior-Driven Development)** — расширение TDD, где сценарии описываются в человекочитаемой форме (`Given/When/Then`), понятной не только разработчикам, но и продакт-менеджерам и QA. Фокус смещается с «как реализовано» на «как система себя ведёт».

**API First** — сначала проектируется и согласовывается контракт API (например, спецификация OpenAPI), и только потом пишется реализация. Фронтенд и бэкенд разрабатываются параллельно на основе одного контракта.

**Code First** — обратный подход: контракт генерируется из уже написанного кода (например, из декораторов контроллера). Быстрее на старте, но сложнее синхронизировать с внешними потребителями до релиза.

```ts
// BDD-стиль теста (например, с Jest + jest-cucumber или просто описательными describe/it)
describe('Корзина покупок', () => {
  describe('когда пользователь добавляет товар', () => {
    it('увеличивает итоговую сумму корзины', () => {
      const cart = new Cart();
      cart.add({ id: 1, price: 100 });
      expect(cart.total()).toBe(100);
    });
  });
});
```

### Несколько из распространенных шаблонов проектирования и может описать области их применения (например, Singleton, Factory Method, Observer и др.)

Singleton гарантирует, что у класса есть только один экземпляр с глобальной точкой доступа к нему — применяется для общих ресурсов вроде конфигурации приложения или единственного соединения с API. Factory Method делегирует создание объектов отдельному методу/классу вместо прямого вызова `new`, что позволяет менять тип создаваемого объекта без изменения кода, который его использует, — полезно, когда логика создания объекта зависит от условий (окружение, фича-флаг). Observer определяет зависимость "один ко многим", при которой изменение состояния одного объекта (subject) автоматически уведомляет всех подписанных наблюдателей — это основа систем событий и реактивности, включая `EventTarget` в браузере и стейт-менеджеры вроде Redux.

```ts
// Singleton: единственный экземпляр конфигурации приложения
class AppConfig {
  private static instance: AppConfig;
  private constructor(public readonly apiUrl: string) {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig(process.env.API_URL ?? '');
    }
    return AppConfig.instance;
  }
}

// Factory Method: создание нужного логгера в зависимости от окружения
interface Logger { log(msg: string): void; }
class ConsoleLogger implements Logger { log(msg: string) { console.log(msg); } }
class SentryLogger implements Logger { log(msg: string) { /* отправка в Sentry */ } }

function createLogger(env: 'dev' | 'prod'): Logger {
  return env === 'prod' ? new SentryLogger() : new ConsoleLogger();
}

// Observer: подписка на изменения состояния
class Subject<T> {
  private observers: Array<(value: T) => void> = [];
  subscribe(fn: (value: T) => void): void {
    this.observers.push(fn);
  }
  notify(value: T): void {
    this.observers.forEach((fn) => fn(value));
  }
}

const cartTotal = new Subject<number>();
cartTotal.subscribe((total) => console.log(`Обновлена сумма: ${total}`));
cartTotal.notify(150);
```

На практике подбор нужных шаблонов часто требует их комбинирования под конкретное требование. Например: нужно логировать события приложения, но состав получателей лога (консоль, Sentry, backend-эндпоинт) должен настраиваться динамически, а сам логгер должен быть один на всё приложение. Комбинируем Singleton (единая точка доступа) + Observer (несколько получателей одного события) поверх примеров выше:

```ts
class AppLogger {
  private static instance: AppLogger;
  private subscribers: Array<(msg: string) => void> = [];
  private constructor() {}

  static getInstance(): AppLogger {
    if (!AppLogger.instance) AppLogger.instance = new AppLogger();
    return AppLogger.instance;
  }

  addSink(sink: (msg: string) => void): void {
    this.subscribers.push(sink);
  }

  log(message: string): void {
    this.subscribers.forEach((sink) => sink(message));
  }
}

const logger = AppLogger.getInstance();
logger.addSink((msg) => console.log(msg));
logger.addSink((msg) => sendToSentry(msg));
logger.log('Пользователь оформил заказ');
```
