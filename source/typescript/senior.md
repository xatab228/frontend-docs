# TypeScript — Senior

### Кастомные утилитарные типы и модификаторы Mapped types

Собственные утилитарные типы строятся на mapped types с модификаторами `+`/`-` перед `readonly` и `?`, позволяющими не только добавлять, но и снимать неизменяемость/опциональность. Key remapping через `as` внутри `[K in keyof T as ...]` позволяет переименовывать или фильтровать ключи на этапе типа (в том числе исключать их через `never`). Это основа для построения доменных утилит, которых нет в стандартной библиотеке TypeScript.

```ts
interface User {
  id: number;
  name: string;
  email?: string;
  password: string;
}

// Комбинация Omit + Partial + Pick для формы редактирования профиля
type ProfileForm = Partial<Pick<Omit<User, 'password'>, 'name' | 'email'>>;

const form: ProfileForm = { name: 'Alex' };
```

```ts
// Снимаем readonly и optional — аналог встроенного Required + Writable
type DeepMutable<T> = {
  -readonly [K in keyof T]: T[K] extends object ? DeepMutable<T[K]> : T[K];
};

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Собственный аналог Pick с фильтрацией по типу значения
type PickByType<T, ValueType> = {
  [K in keyof T as T[K] extends ValueType ? K : never]: T[K];
};

interface Form {
  name: string;
  age: number;
  isActive: boolean;
  email: string;
}

type StringFields = PickByType<Form, string>; // { name: string; email: string }

// Key remapping с `as` — переименование ключей на этапе типа
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type FormGetters = Getters<Form>;
// { getName: () => string; getAge: () => number; ... }
```

### Template literal types, манипулирование типами, lowerCase, upperCase, Capitalize, unCapitalize

Template literal types строят строковые литеральные типы по шаблону, комбинируя литералы и union-типы (результат — декартово произведение вариантов). Встроенные intrinsic-типы `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` трансформируют регистр строковых литералов на уровне типов. Комбинация с mapped types и key remapping позволяет генерировать типизированные API (например, набор `on*`-обработчиков) прямо из описания событий.

```ts
type EventName = 'click' | 'hover' | 'focus';
type HandlerName = `on${Capitalize<EventName>}`;
// 'onClick' | 'onHover' | 'onFocus'

type CssProperty = 'color' | 'background';
type CssVariable = `--${CssProperty}`;
// '--color' | '--background'

// встроенные intrinsic-типы манипуляции строками
type Upper = Uppercase<'hello'>;      // 'HELLO'
type Lower = Lowercase<'HELLO'>;      // 'hello'
type Cap = Capitalize<'hello'>;       // 'Hello'
type Uncap = Uncapitalize<'Hello'>;   // 'hello'

// практический пример: типизированный event emitter
type Events = { click: MouseEvent; change: Event };
type OnMethods = {
  [K in keyof Events as `on${Capitalize<string & K>}`]: (e: Events[K]) => void;
};
```

### Decorators, для чего используются, где используются, как реализовать

Декораторы — функции, применяемые к классам, методам, свойствам или параметрам через синтаксис `@decorator`, позволяющие добавлять поведение декларативно, не изменяя исходный код цели (логирование, валидация, DI, метаданные). Классовый декоратор получает конструктор, декоратор метода — дескриптор свойства, что даёт возможность оборачивать оригинальную реализацию. Широко используются в фреймворках вроде Angular и NestJS для маршрутизации, внедрения зависимостей и валидации DTO; требуют включения `experimentalDecorators` (и часто `emitDecoratorMetadata`) в tsconfig.

```ts
// декоратор класса (legacy synatx, experimentalDecorators: true)
function Logger(constructor: Function) {
  console.log(`Class created: ${constructor.name}`);
}

@Logger
class UserService {}

// декоратор метода
function LogExecution(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with`, args);
    return original.apply(this, args);
  };
  return descriptor;
}

class OrderService {
  @LogExecution
  createOrder(id: number) {
    return `Order ${id} created`;
  }
}

// декоратор с фабрикой параметров
function MinLength(length: number) {
  return function (target: any, propertyKey: string) {
    let value: string;
    Object.defineProperty(target, propertyKey, {
      get: () => value,
      set: (newVal: string) => {
        if (newVal.length < length) throw new Error('Too short');
        value = newVal;
      },
    });
  };
}

class Account {
  @MinLength(6)
  password!: string;
}
```

### Типизация дженерик функций, использование типов ReturnType, Parameters

`ReturnType<F>` извлекает тип возвращаемого значения функции, `Parameters<F>` — кортеж типов её параметров. Вместе с `typeof` для получения типа существующей функции они позволяют строить типобезопасные обёртки (логирование, кэширование, мемоизация), которые сохраняют исходную сигнатуру без её ручного дублирования — важно для поддержания синхронизации типов при рефакторинге.

```ts
function createUser(name: string, age: number) {
  return { id: Date.now(), name, age };
}

type CreateUserReturn = ReturnType<typeof createUser>;
// { id: number; name: string; age: number }

type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number]

// использование для построения обёрток с сохранением сигнатуры
function withLogging<F extends (...args: any[]) => any>(fn: F) {
  return (...args: Parameters<F>): ReturnType<F> => {
    console.log('Calling with', args);
    return fn(...args);
  };
}

const loggedCreateUser = withLogging(createUser);
const user = loggedCreateUser('Alex', 30); // тип результата выведен корректно
```

### Ключевое слово infer, как работает, в каких случаях используется

`infer` объявляет "переменную типа" внутри условного типа, которая захватывает часть проверяемого типа для использования в ветке `true`. Применяется для извлечения типа элемента массива, типа внутри `Promise`, возвращаемого значения или аргумента функции — на нём построены встроенные `ReturnType` и `Parameters`. Может использоваться рекурсивно для разворачивания вложенных структур (например, `Promise<Promise<T>>`).

```ts
// извлечение типа элемента массива
type ElementType<T> = T extends (infer U)[] ? U : never;

// извлечение типа, который оборачивает Promise
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type Result = UnwrapPromise<Promise<string>>; // string

// собственная реализация ReturnType
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// извлечение типа первого аргумента функции
type FirstArg<T> = T extends (arg: infer A, ...rest: any[]) => any ? A : never;

// рекурсивный infer — разворачивание вложенных Promise
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T;
type Deep = DeepUnwrap<Promise<Promise<number>>>; // number
```

### Mixins, что это, в каких случаях используются

Миксины — паттерн композиции поведения нескольких классов в один, обходящий отсутствие множественного наследования в JS/TS. Реализуются как функции, принимающие класс-конструктор (`Constructor<T>`) и возвращающие новый класс, расширяющий переданный дополнительными полями/методами. Используются, когда нужно переиспользовать общую функциональность (логирование, сериализация, таймстампы) между несвязанными по иерархии классами.

```ts
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now();
  };
}

function Serializable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    serialize() {
      return JSON.stringify(this);
    }
  };
}

class User {
  constructor(public name: string) {}
}

const TimestampedUser = Timestamped(User);
const TimestampedSerializableUser = Serializable(Timestamped(User));

const instance = new TimestampedSerializableUser('Alex');
console.log(instance.timestamp, instance.serialize());
```

### Поля, которые отвечают за настройки генерации и вывода файлов, импорты и совместимость, настройки производительности, декораторов и метаданных

Группа `outDir`/`rootDir`/`declaration`/`sourceMap` управляет тем, куда и в каком виде компилируется код и генерируются ли типы (.d.ts) и карты исходников. `esModuleInterop`, `moduleResolution`, `isolatedModules`, `skipLibCheck` отвечают за совместимость импортов CommonJS/ESM и корректность работы с внешними сборщиками (esbuild, swc). `incremental`/`composite` ускоряют повторную компиляцию за счёт кэша и project references. `experimentalDecorators`/`emitDecoratorMetadata` включают декораторы и генерацию метаданных типов, необходимую для reflection-based DI (NestJS, Angular).

```json
{
  "compilerOptions": {
    // генерация и вывод файлов
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,          // генерировать .d.ts
    "declarationMap": true,       // source map для .d.ts
    "sourceMap": true,
    "removeComments": true,

    // импорты и совместимость
    "esModuleInterop": true,          // корректный импорт CommonJS модулей как default
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "bundler",    // алгоритм разрешения модулей
    "isolatedModules": true,          // каждый файл транспилируется независимо (нужно для esbuild/swc)
    "skipLibCheck": true,             // не проверять типы в .d.ts зависимостей — ускоряет сборку

    // производительность
    "incremental": true,              // инкрементальная компиляция, кэш в .tsbuildinfo
    "composite": true,                // поддержка project references для монорепо

    // декораторы и метаданные
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true     // генерирует метаданные типов для рефлексии (нужно для DI в NestJS/Angular)
  }
}
```

### Объявления глобальных сущностей и типов, типизация библиотек, ключевые слова declare, namespace

`declare` объявляет сущность (переменную, функцию, модуль), реализация которой существует вне зоны видимости TypeScript (глобальный скрипт, JS-библиотека без типов) — компилятор верит объявлению без проверки реализации. `declare global` внутри модуля расширяет глобальные типы (например, добавляет свойство в `Window`). `declare module` описывает типы для стороннего пакета, у которого их нет. `namespace` группирует связанные типы под общим именем — используется реже с приходом ES-модулей, но всё ещё актуально для глобальных типов legacy-библиотек, подключаемых через `<script>`.

```ts
// global.d.ts — глобальная переменная, добавленная сторонним скриптом
declare const APP_VERSION: string;

declare global {
  interface Window {
    analytics: {
      track(event: string, payload?: Record<string, unknown>): void;
    };
  }
}

// типизация модуля без встроенных типов
declare module 'legacy-untyped-lib' {
  export function doSomething(config: { retries: number }): Promise<void>;
}

// namespace — группировка связанных типов (используется реже с приходом ES modules,
// но актуально для глобальных типов сторонних библиотек, например через <script>)
declare namespace MyLib {
  interface Config {
    apiKey: string;
  }
  function init(config: Config): void;
}

MyLib.init({ apiKey: 'abc' });
```

### Объявление констант с использованием as const, для чего нужно, в каких случаях использовать

`as const` переводит литерал в режим максимально узкого вывода типа: массивы становятся readonly-кортежами, объекты — с readonly-полями и литеральными (а не расширенными) типами значений. Используется, чтобы получить из массива или объекта union строковых литералов (через `typeof arr[number]`), например для построения типа ролей или кодов статусов без дублирования значений в отдельном type-объявлении.

```ts
const colors = ['red', 'green', 'blue']; // string[]
const colorsConst = ['red', 'green', 'blue'] as const; // readonly ['red', 'green', 'blue']

const config = {
  env: 'production',
  retries: 3,
}; // { env: string; retries: number }

const configConst = {
  env: 'production',
  retries: 3,
} as const; // { readonly env: 'production'; readonly retries: 3 }

// частый паттерн: генерация union-типа из массива значений
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'editor' | 'viewer'

function checkRole(role: Role) {
  console.log(role);
}
checkRole('admin');
// checkRole('superadmin'); // ошибка — не входит в Role
```

Дополнительно — фабрика типов на основе объекта-константы:

```ts
const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]; // 200 | 404 | 500

// фабрика типов: генерирует тип action по названию события
type ActionMap<T extends Record<string, unknown>> = {
  [K in keyof T]: { type: K; payload: T[K] };
}[keyof T];

type Events = { login: { userId: number }; logout: undefined };
type AppAction = ActionMap<Events>;
// { type: 'login'; payload: { userId: number } } | { type: 'logout'; payload: undefined }
```
