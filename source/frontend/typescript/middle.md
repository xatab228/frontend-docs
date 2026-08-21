# TypeScript — Middle

## Type guard, операторы is, in, instanceof в каких случаях необходимо применять

Type guard — конструкция, сужающая union-тип до конкретного варианта внутри блока кода. `typeof` применяется для примитивов, `instanceof` — для проверки принадлежности к классу, `in` — для проверки наличия свойства у plain-объектов без общего класса. Кастомный предикат `arg is Type` позволяет вынести сложную логику проверки в отдельную функцию и переиспользовать её, сохраняя сужение типа в вызывающем коде.

```ts
// typeof — для примитивов
function process(value: string | number) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase());
  } else {
    console.log(value.toFixed(2));
  }
}

// instanceof — для классов
class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

function handleError(err: Error) {
  if (err instanceof ApiError) {
    console.log(err.code);
  }
}

// in — для проверки наличия свойства (когда типы — plain-объекты без класса)
interface Cat { meow(): void }
interface Dog { bark(): void }

function makeSound(animal: Cat | Dog) {
  if ('meow' in animal) {
    animal.meow();
  } else {
    animal.bark();
  }
}

// пользовательский type guard с предикатом is
function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}

function handle(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow(); // тип сужен до Cat
  }
}
```

## Mapped type, ключевое слово keyof, для чего применяется

Mapped type строит новый тип, перебирая ключи существующего через `[K in keyof T]`, позволяя массово менять модификаторы (readonly, optional) или тип значений — на этом принципе построены `Partial`, `Readonly` и другие встроенные утилиты. `keyof T` возвращает union строковых литералов всех ключей `T` и используется вместе с generic-ограничениями, чтобы гарантировать, что переданный ключ действительно существует в объекте.

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Alex' };
const name = getProperty(user, 'name'); // ok, тип string
// getProperty(user, 'unknown'); // ошибка — 'unknown' не ключ user
```

## Conditional type, синтаксис условных типов

Условные типы (`T extends U ? X : Y`) вычисляют тип на основе проверки соответствия одного типа другому, работая по аналогии с тернарным оператором, но на уровне системы типов. Используются для построения гибких API, где тип результата зависит от типа входных данных, и лежат в основе многих встроенных утилит (`Exclude`, `Extract`, `ReturnType`).

```ts
type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
```

## Базовые generics (`function<T>(arg: T)`), constraints (`extends`)

Базовый generic-параметр `<T>` делает функцию или класс параметризованными типом, который выводится из аргументов вызова. Ограничение `extends` сужает допустимые типы до тех, что удовлетворяют определённой структуре (например, имеют свойство `length`), что даёт доступ к этим свойствам внутри тела функции, сохраняя при этом гибкость дженерика.

```ts
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(item: T): void {
  console.log(item.length);
}

logLength('hello');       // ok — строки имеют length
logLength([1, 2, 3]);     // ok
// logLength(42);          // ошибка — число не имеет length

class Repository<T extends { id: number }> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  findById(id: number): T | undefined {
    return this.items.find((item) => item.id === id);
  }
}

const userRepo = new Repository<{ id: number; name: string }>();
userRepo.add({ id: 1, name: 'Alex' });
```

## Работа с нативными дженериками (Promise, Array, Map, Record и др.)

Большая часть встроенных типов параметризована: `Array<T>`, `Promise<T>`, `Map<K, V>`, `Set<T>`, `Record<K, V>`, `Partial<T>`. Понимать их нужно раньше, чем писать собственные дженерики — именно с ними сталкиваешься каждый день при типизации асинхронного кода и коллекций.

```ts
interface User { id: number; name: string }

// Promise<T> — T это то, чем промис РАЗРЕШИТСЯ, а не сама функция
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  return res.json() as Promise<User>
}

// await разворачивает Promise<T> → T
const user: User = await fetchUser(1)

// Promise.all сохраняет типы каждого элемента кортежа
const [profile, settings] = await Promise.all([fetchUser(1), fetchSettings()])
// profile: User, settings: Settings

// Коллекции: параметры типа задают и ключ, и значение
const byId = new Map<number, User>()
const roles = new Set<'admin' | 'user'>()
const dictionary: Record<string, number> = { views: 10 }

// Дженерики стримов и наблюдаемых значений устроены так же
const subject: Observable<User[]> = users$
```

Типичные ошибки: писать `Promise<any>` вместо конкретного типа (теряется вся проверка после `await`), объявлять `const map = new Map()` без параметров (получается `Map<any, any>`), и указывать возвращаемый тип `User` у `async`-функции — компилятор потребует именно `Promise<User>`.

## Unknown, void, never; optional (?) и readonly свойства в интерфейсах; union/intersection types

`unknown` требует сужения перед использованием, `void` — отсутствие возвращаемого значения, `never` — недостижимость. В интерфейсах `?` делает поле необязательным, а `readonly` запрещает переприсваивание после инициализации объекта — это помогает моделировать неизменяемые структуры данных. Union и intersection комбинируют типы для описания альтернатив или объединения контрактов.

```ts
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function handleResult<T>(result: ApiResult<T>): void {
  if (result.status === 'success') {
    console.log(result.data); // сужено до success-варианта
  } else {
    console.error(result.message); // сужено до error-варианта
  }
}
```

## Отличия между type и interface

`interface` можно расширять через `extends` и дополнять через declaration merging (повторное объявление с тем же именем объединяет поля); используется в основном для описания форм объектов и контрактов классов. `type` — более универсален: может описывать union, intersection, tuple, примитивы и mapped/conditional типы, но не поддерживает merging. На практике `interface` выбирают для публичных API объектов/классов, `type` — для сложных композиций типов.

```ts
interface Identifiable {
  id: number;
}

interface Timestamped {
  createdAt: Date;
}

interface Auditable extends Identifiable, Timestamped {
  updatedBy: string;
}

const record: Auditable = {
  id: 1,
  createdAt: new Date(),
  updatedBy: 'admin',
};
```

## Ключевое слово as, что делает, в каких случаях уместно использовать

`as` выполняет type assertion — сообщает компилятору "доверяй мне, это именно такой тип", не производя реальной проверки или преобразования во время выполнения. Уместен, когда разработчик обладает информацией, недоступной компилятору (например, результат `JSON.parse` или DOM-элемент из `querySelector`), но злоупотребление им (особенно двойное приведение через `as unknown as X`) обходит систему типов и может маскировать ошибки.

```ts
const input = document.querySelector('#email') as HTMLInputElement;
console.log(input.value);
```

## Наследование в typeScript, вызов конструктора родительского класса

Наследование классов реализуется через `extends`; дочерний класс получает доступ к полям и методам родителя. Если у дочернего класса есть собственный `constructor`, он обязан вызвать `super(...)` до обращения к `this`, чтобы инициализировать часть состояния, принадлежащую родительскому классу.

```ts
class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

const err = new ApiError(404, 'Not found');
console.log(err.message, err.code);
```

## Конфигурация на базовом уровне, знать основные правила отвечающие за строгость типов, и целевую версию ES, настройку путей (поле paths)

`target` определяет версию ECMAScript, в которую компилируется код (влияет на доступность синтаксиса и полифиллов). `strict` включает пакет строгих проверок (`noImplicitAny`, `strictNullChecks` и др.), заметно повышающих надёжность типизации. `baseUrl` и `paths` настраивают алиасы импортов относительно базовой директории, упрощая пути в крупных проектах.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```
