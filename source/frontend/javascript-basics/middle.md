# Основы JavaScript — Middle

## Синтаксис и возможности деструктуризации для извлечения данных из объектов и массивов

Деструктуризация позволяет извлекать значения из объектов и массивов в отдельные переменные с поддержкой переименования, значений по умолчанию, вложенности и rest-элементов.

```js
const { a, b: renamed, c = 10, ...rest } = { a: 1, b: 2, d: 4, e: 5 };
// a=1, renamed=2, c=10 (default), rest = {d:4, e:5}

const [first, , third, ...others] = [1, 2, 3, 4, 5];
// first=1, third=3, others=[4,5]

const { user: { name, address: { city } = {} } = {} } = data;

function greet({ name, age = 18 } = {}) {
  console.log(`${name}, ${age}`);
}

[a, b] = [b, a];

const key = "x";
const { [key]: value } = { x: 42 }; // value = 42
```

Корректно использовать `??` вместо `||` при работе с 0, `''`, false: `||` заменяет любое falsy-значение дефолтом, а `??` — только `null`/`undefined`, что критично для настроек, где 0 или false являются валидными значениями.

```js
function applySettings(input) {
  return {
    volume: input.volume ?? 50,
    label: input.label ?? "default",
    enabled: input.enabled ?? true,
  };
}

console.log(applySettings({ volume: 0, label: "", enabled: false }));
// { volume: 0, label: "", enabled: false } — с || все три поля были бы перезаписаны дефолтами
```

## Как работают объектные обёртки и их влияние на примитивы

При вызове метода на примитиве (например, `"str".toUpperCase()`) JS временно оборачивает примитив в объектную обёртку (String, Number, Boolean), вызывает метод и уничтожает обёртку. Сам примитив при этом остаётся неизменным и не превращается в объект.

## Современные способы работы с модулями: именованный экспорт, экспорт по умолчанию, переименование

ES-модули поддерживают именованный экспорт (`export const x`), экспорт по умолчанию (`export default`) и переименование при экспорте/импорте (`export { x as y }`, `import { y as z }`). Именованных экспортов может быть много, экспорт по умолчанию — только один на модуль.

## Как реализовать базовые структуры данных с использованием массивов (в т.ч. стэк и очередь)

Стек (LIFO) реализуется через `push`/`pop`, очередь (FIFO) — через `push`/`shift`. `shift` на массиве работает за O(n), поэтому для эффективной очереди применяют индекс головы вместо удаления элементов.

```js
class Stack {
  #items = [];
  push(item) { this.#items.push(item); }
  pop() { return this.#items.pop(); }
  peek() { return this.#items[this.#items.length - 1]; }
  isEmpty() { return this.#items.length === 0; }
}

class Queue {
  #items = [];
  enqueue(item) { this.#items.push(item); }
  dequeue() { return this.#items.shift(); } // O(n) — плохо для больших очередей
}

class EfficientQueue {
  #items = [];
  #headIndex = 0;
  enqueue(item) { this.#items.push(item); }
  dequeue() {
    if (this.#headIndex >= this.#items.length) return undefined;
    const item = this.#items[this.#headIndex];
    this.#items[this.#headIndex] = undefined;
    this.#headIndex++;
    return item;
  }
}
```

## Алгоритмы приведения типов: ToBoolean, ToString, ToNumber, ToPrimitive (valueOf, toString)

`ToPrimitive` конвертирует объект в примитив, используя подсказку (hint): `"number"`, `"string"` или `"default"`. По умолчанию сначала пробуется `valueOf`, затем `toString` (для hint "string" — наоборот). Symbol.toPrimitive позволяет полностью переопределить эту логику.

```js
const obj = {
  valueOf() { return 42; },
  toString() { return "str"; }
};
console.log(obj + 1);        // 43 (hint "default" -> valueOf сначала)
console.log(`${obj}`);       // "str" (hint "string" -> toString сначала)
console.log(Number(obj));    // 42 (hint "number")

const custom = {
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return 100;
    if (hint === "string") return "sto";
    return "default!";
  }
};
console.log(+custom);        // 100
console.log(`${custom}`);    // "sto"
console.log(custom + "");    // "default!"
```

Также сюда относится преобразование через `JSON.stringify`/`JSON.parse` с кастомными replacer/reviver.

```js
const user = {
  id: 1,
  name: "Anna",
  password: "secret123",
  createdAt: new Date("2024-01-01"),
};

const json = JSON.stringify(user, ["id", "name", "createdAt"], 2);
console.log(json);

const jsonFn = JSON.stringify(user, (key, value) =>
  key === "password" ? undefined : value
);

const restored = JSON.parse(jsonFn, (key, value) => {
  if (key === "createdAt") return new Date(value);
  return value;
});
console.log(restored.createdAt instanceof Date); // true
```

## Управление контекстом: call, apply, bind — различия и практическое применение

`call` и `apply` вызывают функцию немедленно с заданным `this` (различаются форматом передачи аргументов: список vs массив). `bind` возвращает новую функцию с зафиксированным `this`, вызывающуюся позже.

```js
function introduce(greeting, punctuation) {
  console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

const person = { name: "Anna" };

introduce.call(person, "Hi", "!");
introduce.apply(person, ["Hi", "!"]);

const bound = introduce.bind(person, "Hello");
bound("!!!");
```

## Причины потери контекста и способы их предотвращения

Контекст `this` теряется, когда метод передаётся как колбэк (например, в `setTimeout` или обработчик события) без привязки — тогда `this` определяется способом вызова, а не местом объявления. Предотвращается через `bind`, стрелочные функции или сохранение ссылки на `this` в замыкании.

## Лексическое окружение (Lexical Environment), Environment Record, параметры как часть окружения

Каждый вызов функции создаёт Lexical Environment — структуру, хранящую локальные переменные (Environment Record) и ссылку на внешнее окружение. Параметры функции также хранятся как часть этого окружения, что и обеспечивает работу замыканий и области видимости.

## Основные компоненты Event Loop и порядок выполнения задач

Event Loop состоит из call stack (стека вызовов), очереди задач (macrotask queue) и очереди микрозадач (microtask queue). После освобождения стека сначала полностью опустошается очередь микрозадач, затем выполняется одна макрозадача, и цикл повторяется.

## Особенности работы async функций и их взаимодействие с Promise

`async`-функция всегда возвращает Promise, а `await` приостанавливает её выполнение до разрешения промиса, не блокируя основной поток. Ошибки внутри async-функции можно перехватывать через `try...catch`, как синхронные.

```js
async function getData() {
  try {
    const response = await fetch("/api/data");
    const json = await response.json();
    return json;
  } catch (err) {
    console.error("Ошибка запроса:", err);
    throw err;
  }
}

getData().then(data => console.log(data));
```

```js
try {
  JSON.parse("{invalid json}");
} catch (error) {
  console.error(error instanceof SyntaxError, error.message);
} finally {
  console.log("выполнится всегда, даже при return/throw в try/catch");
}
```

## Разницу между макро- и микрозадачами и их приоритеты

Микрозадачи (Promise-колбэки, `queueMicrotask`) имеют более высокий приоритет и выполняются полностью перед следующей макрозадачей (`setTimeout`, события UI, I/O). Поэтому `Promise.resolve().then()` выполнится раньше, чем `setTimeout(fn, 0)`.

## Методы Promise API и их поведение в различных сценариях, включая ошибки

`Promise.all` отклоняется целиком при первом же rejected-промисе; `Promise.allSettled` дожидается всех промисов независимо от результата и возвращает статус каждого.

```js
const p1 = Promise.resolve(1);
const p2 = Promise.reject("err");
const p3 = new Promise(res => setTimeout(() => res(3), 100));

await Promise.all([p1, p3]).catch(e => e);       // [1, 3]
await Promise.all([p1, p2]).catch(e => console.log(e)); // "err"

await Promise.allSettled([p1, p2]);
// [{status:"fulfilled", value:1}, {status:"rejected", reason:"err"}]
```

## Принципы работы прототипного наследования и цепочки прототипов.

Каждый объект имеет внутреннюю ссылку `[[Prototype]]` на другой объект. При обращении к свойству, отсутствующему в самом объекте, поиск идёт вверх по цепочке прототипов, пока свойство не найдётся или цепочка не закончится на `null`.

```js
const animal = {
  eat() { console.log("eating"); }
};
const dog = Object.create(animal);
dog.bark = function () { console.log("bark"); };

dog.bark();
dog.eat();

console.log(Object.getPrototypeOf(dog) === animal); // true
console.log(dog.hasOwnProperty("bark")); // true
console.log(dog.hasOwnProperty("eat"));  // false — унаследовано

function Foo() {}
Foo.prototype.greet = function () { return "hi"; };
const f = new Foo();
console.log(Object.getPrototypeOf(f) === Foo.prototype); // true
```

Наследование можно реализовать и вручную через функции-конструкторы и `prototype`:

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.speak = function () {
  return `${Animal.prototype.speak.call(this)}. Woof!`;
};

const rex = new Dog("Rex", "Labrador");
console.log(rex.speak()); // "Rex makes a sound. Woof!"
console.log(rex instanceof Animal); // true
```

## Синтаксис классов и их возможности

Классы — синтаксический сахар над прототипным наследованием, поддерживают конструктор, методы, геттеры/сеттеры, статические поля и методы, а также наследование через `extends`/`super`.

```js
class Animal {
  static count = 0;

  constructor(name) {
    this.name = name;
    Animal.count++;
  }

  speak() {
    return `${this.name} makes a sound`;
  }

  get info() {
    return `Animal: ${this.name}`;
  }

  static create(name) {
    return new Animal(name);
  }
}

class Dog extends Animal {
  speak() {
    return `${super.speak()}. Woof!`;
  }
}

const d = new Dog("Rex");
console.log(d.speak()); // "Rex makes a sound. Woof!"
```
