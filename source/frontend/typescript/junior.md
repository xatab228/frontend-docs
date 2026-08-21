# TypeScript — Junior

## Примитивные типы данных отличающиеся от JS (void, never, any, unknown) и в каких случаях их применять

`void` обозначает отсутствие возвращаемого значения у функции — используется для функций без `return`. `never` — тип значений, которые никогда не наступают: недостижимый код, функции, всегда бросающие исключение, или исчерпывающая проверка union-типов. `any` полностью отключает проверку типов и должен использоваться только как временная мера или при работе с непредсказуемыми данными. `unknown` — безопасная альтернатива `any`: значение можно присвоить куда угодно, но перед использованием его нужно сузить (type guard), иначе компилятор не даст обратиться к его свойствам.

```ts
let age: number = 30;
let name: string = 'Alex';
let isActive: boolean = true;

interface Product {
  id: number;
  title: string;
  price: number;
}

function printProduct(product: Product): void {
  console.log(`${product.title} — ${product.price}`);
}
```

## Объектные типы данных (object, Enum, Array, Tuple, Function) как их объявлять и в каких случаях использовать

`object` описывает любой не-примитив. `Enum` задаёт именованный набор констант (числовых или строковых) — удобен для ограниченного набора вариантов вроде статусов. `Array<T>` / `T[]` — массив однородных элементов. `Tuple` — массив фиксированной длины с типом для каждой позиции, применяется когда порядок и количество элементов важны (например, пара `[string, number]`). Тип `Function` или сигнатуры `(a: T) => R` описывают функции как значения — часто используются для колбэков.

```ts
enum OrderStatus {
  Pending,
  Shipped,
  Delivered,
}

const numbers: number[] = [1, 2, 3];
const pair: [string, number] = ['id', 42];

function onOrderChange(status: OrderStatus): void {
  console.log(status);
}
```

## Пересечения и объединения типов

Union (`A | B`) означает, что значение может быть одним из перечисленных типов — используется, когда переменная может принимать разные формы (например, результат может быть строкой или числом). Intersection (`A & B`) объединяет несколько типов в один, требующий одновременного соответствия всем — применяется для комбинирования интерфейсов или расширения объекта дополнительными полями.

```ts
type Id = string | number;

interface Named { name: string }
interface Aged { age: number }
type Person = Named & Aged;

const p: Person = { name: 'Alex', age: 30 };
```

## Generics и как их использовать

Дженерики позволяют писать переиспользуемый код, параметризованный типом, не теряя строгую типизацию — вместо `any` тип подставляется на месте вызова и выводится автоматически или указывается явно. Применяются в функциях, классах, интерфейсах, когда логика одинакова для разных типов данных (контейнеры, обёртки, утилиты).

```ts
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(5);
const str = identity('hello'); // T выведен как string
```

## Модификаторы доступа и их отличия

`public` (по умолчанию) — свойство доступно отовсюду. `private` — доступно только внутри самого класса. `protected` — доступно внутри класса и его наследников. Используются для инкапсуляции: скрытия внутренней реализации и контроля того, что можно менять извне.

```ts
class Account {
  public id: number;
  private balance: number = 0;
  protected owner: string;

  constructor(id: number, owner: string) {
    this.id = id;
    this.owner = owner;
  }

  private log(msg: string) {
    console.log(msg);
  }
}
```

## Синтаксис классов, ключевые слова extends, implements, constructor

`class` объявляет класс с полями и методами; `constructor` — специальный метод инициализации, вызываемый при создании экземпляра через `new`. `extends` реализует наследование от другого класса (одиночное), давая доступ к его свойствам и методам через `super`. `implements` заставляет класс соответствовать структуре интерфейса — это только проверка типов на этапе компиляции, без наследования реализации.

```ts
interface Logger {
  log(message: string): void;
}

class OrderService implements Logger {
  private orders: string[] = [];

  constructor(public readonly logger: Logger = console) {}

  log(message: string): void {
    this.logger.log(message);
  }

  addOrder(id: string): void {
    this.orders.push(id);
    this.log(`Order ${id} added`);
  }
}

const service = new OrderService();
service.addOrder('A-1');
```

## Утилитарные типы (Partial, Required, Readonly, Pick, Omit)

Встроенные generic-утилиты трансформируют существующие типы без дублирования кода. `Partial<T>` делает все поля опциональными (удобно для DTO обновления), `Required<T>` — обязательными, `Readonly<T>` — неизменяемыми, `Pick<T, K>` выбирает подмножество полей, `Omit<T, K>` исключает подмножество. Применяются для построения производных типов (форм, DTO, view-моделей) из одной базовой сущности.

```ts
interface Settings {
  theme: string;
  fontSize: number;
}

function applyDefaults(overrides: Partial<Settings>): Required<Settings> {
  return { theme: 'light', fontSize: 14, ...overrides };
}

const readonlySettings: Readonly<Settings> = applyDefaults({ theme: 'dark' });
```

```ts
interface User {
  id: number;
  name: string;
  email?: string;
}

// Partial<T> — делает все свойства опциональными
type UserUpdate = Partial<User>;
const update: UserUpdate = { name: 'New name' };

// Required<T> — делает все свойства обязательными
type StrictUser = Required<User>;
const strictUser: StrictUser = { id: 1, name: 'Alex', email: 'a@a.com' };

// Readonly<T> — делает все свойства неизменяемыми
type ImmutableUser = Readonly<User>;
const frozen: ImmutableUser = { id: 1, name: 'Alex' };
// frozen.name = 'Другое'; // ошибка компиляции

// Pick<T, K> — выбирает подмножество свойств
type UserPreview = Pick<User, 'id' | 'name'>;
const preview: UserPreview = { id: 1, name: 'Alex' };

// Omit<T, K> — исключает подмножество свойств
type UserWithoutEmail = Omit<User, 'email'>;
const noEmail: UserWithoutEmail = { id: 1, name: 'Alex' };
```
