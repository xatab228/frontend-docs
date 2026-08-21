# Основы JavaScript — Senior

## Статичные методы массивов и объектов

Статические методы (`Array.from`, `Array.isArray`, `Object.keys`, `Object.entries`, `Object.fromEntries`, `Object.assign`) вызываются на самом конструкторе, а не на экземпляре, и служат для создания/преобразования коллекций.

```js
const user = { id: 1, name: "Anna", password: "secret", token: "abc123" };

const publicFields = ["password", "token"];
const safeUser = Object.fromEntries(
  Object.entries(user).filter(([key]) => !publicFields.includes(key))
);
console.log(safeUser); // { id: 1, name: "Anna" }

const freq = Array.from("banana").reduce((acc, ch) => {
  acc[ch] = (acc[ch] ?? 0) + 1;
  return acc;
}, {});
console.log(freq); // { b: 1, a: 3, n: 2 }
```

## Как работают остаточные параметры и оператор расширения, их различия и ограничения

Rest (`...rest`) собирает оставшиеся элементы в массив/объект, spread (`...arr`) распаковывает элементы наружу. Оба работают неглубоко (shallow) — вложенные объекты копируются по ссылке, что может привести к неожиданным мутациям общих данных.

```js
function sum(first, ...rest) {
  return first + rest.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10, rest = [2,3,4]

const [head, ...tail] = [1, 2, 3]; // tail = [2, 3]
const { a, ...others } = { a: 1, b: 2, c: 3 }; // others = {b:2, c:3}

const arr = [1, 2, 3];
console.log(Math.max(...arr));

const merged = [...arr, 4, 5];
const objMerged = { ...{a:1}, ...{b:2} };

const original = { id: 1, meta: { tags: ["a", "b"] } };

const shallowCopy = { ...original };
shallowCopy.meta.tags.push("c");
console.log(original.meta.tags); // ["a", "b", "c"] — вложенный объект общий!

const deepCopy = {
  ...original,
  meta: { ...original.meta, tags: [...original.meta.tags] },
};
deepCopy.meta.tags.push("d");
console.log(original.meta.tags); // без изменений
```

## Способы конфигурирования объектов (defineProperty)

`Object.defineProperty` позволяет задавать дескрипторы свойств: `writable`, `enumerable`, `configurable`, а также геттеры/сеттеры вместо `value`. Это даёт тонкий контроль над видимостью и изменяемостью свойств, недоступный при обычном присваивании.

```js
Object.defineProperty(obj, "x", {
  value: 42,
  writable: false,
  enumerable: false,
  configurable: false
});

let _value = 0;
Object.defineProperty(obj, "value", {
  get() { return _value; },
  set(v) {
    if (v < 0) throw new RangeError("negative");
    _value = v;
  },
  enumerable: true,
  configurable: true
});

const frozen = Object.freeze({ nested: { a: 1 } });
frozen.nested.a = 2; // сработает! freeze поверхностный
console.log(frozen.nested.a); // 2
```

## Основные принципы функционального программирования и их применении в JavaScript

Функциональный подход опирается на чистые функции (без побочных эффектов, одинаковый результат на одинаковых входах), иммутабельность данных, композицию и функции высшего порядка (каррирование, частичное применение).

```js
let total = 0;
function addImpure(x) { total += x; return total; }

function addPure(a, b) { return a + b; }

const addItem = (arr, item) => [...arr, item];
```

```js
const curry = fn => (...args) =>
  args.length >= fn.length
    ? fn(...args)
    : (...rest) => curry(fn)(...args, ...rest);

const add3 = (a, b, c) => a + b + c;
const curriedAdd = curry(add3);
curriedAdd(1)(2)(3); // 6
curriedAdd(1, 2)(3); // 6

function multiply(a, b, c) {
  return a * b * c;
}

const double = multiply.bind(null, 2);
console.log(double(3, 4)); // 24 (2*3*4)

const doubleOfTen = double.bind(null, 10);
console.log(doubleOfTen(5)); // 100 (2*10*5)
```

Также сюда относится осторожное применение рекурсии, поскольку V8 не оптимизирует хвостовые вызовы (TCO):

```js
function sumNaive(n) {
  if (n === 0) return 0;
  return n + sumNaive(n - 1); // sumNaive(100000) -> RangeError
}

function sumIterative(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}

function trampoline(fn) {
  return (...args) => {
    let result = fn(...args);
    while (typeof result === "function") result = result();
    return result;
  };
}
const sumTrampolined = trampoline(function sum(n, acc = 0) {
  if (n === 0) return acc;
  return () => sum(n - 1, acc + n);
});
console.log(sumTrampolined(100000)); // работает без переполнения стека
```

## Преимущества Map и Set перед объектами и массивами

`Map` поддерживает ключи любого типа (включая объекты), сохраняет порядок вставки и имеет `size`. `Set` хранит только уникальные значения. Оба эффективнее объектов/массивов при частых вставках и удалениях.

```js
const map = new Map();
const objKey = { id: 1 };
map.set(objKey, "value for object key");
map.set(NaN, "nan works as key");
console.log(map.get(objKey)); // "value for object key"
console.log(map.size); // 2

const unique = [...new Set([1, 2, 2, 3, NaN, NaN])]; // [1, 2, 3, NaN]
```

## Как работают WeakMap и WeakSet, их преимущества и ограничения

`WeakMap`/`WeakSet` хранят ключи только как объекты со слабой ссылкой — если на объект-ключ больше нет других ссылок, сборщик мусора удаляет и его, и запись в коллекции. Из-за этого они не перечисляемы и не имеют `size`/`forEach`, зато не создают утечек памяти.

```js
let obj = { data: "sensitive" };
const wm = new WeakMap();
wm.set(obj, "metadata");
console.log(wm.get(obj)); // "metadata"

obj = null;
// теперь GC может очистить и объект, и запись в wm — предотвращает утечки памяти

const nodeMetadata = new WeakMap();

function attachHandler(node, handlerFn) {
  nodeMetadata.set(node, { handlerFn, attachedAt: Date.now() });
  node.addEventListener("click", handlerFn);
}

function removeNode(node) {
  node.remove();
  // запись в nodeMetadata сама очистится сборщиком мусора — утечки нет
}
```

## Устройство лексического окружения (Lexical Environment) и scope chain в замыканиях

Каждая функция при создании запоминает ссылку на Lexical Environment, в котором она была объявлена. При обращении к this-функции внутри колбэков или таймеров важно понимать, как сохраняется контекст:

```js
class Timer {
  seconds = 0;
  start() {
    setTimeout(function () {
      this.seconds++; // this === undefined/window, НЕ Timer!
    }, 1000);
  }
}

// 1. Стрелочная функция — лексический this
start() {
  setTimeout(() => { this.seconds++; }, 1000); // OK
}

// 2. Явный bind
btn.addEventListener("click", obj.method.bind(obj));

// 3. Class field со стрелочной функцией
class Timer {
  seconds = 0;
  tick = () => { this.seconds++; };
}

// 4. Сохранение ссылки на this (устаревший подход)
const self = this;
setTimeout(function () { self.seconds++; }, 1000);
```

## Как работают асинхронные итераторы и где они могут быть полезны

Асинхронный итератор (`Symbol.asyncIterator`) позволяет асинхронно получать значения по одному через `for await...of` — полезно для постраничной загрузки данных, потоков и других источников, где значения приходят с задержкой.

```js
async function* fetchPages(baseUrl) {
  let page = 1;
  while (true) {
    const res = await fetch(`${baseUrl}?page=${page}`);
    const data = await res.json();
    if (data.items.length === 0) return;
    yield data.items;
    page++;
  }
}

for await (const items of fetchPages("/api/list")) {
  console.log(items);
}
```

## Как работают приватные поля и методы в классах

Приватные поля и методы (`#field`) доступны только внутри самого класса, недоступны снаружи и не участвуют в наследовании через обычный прототипный доступ — попытка обратиться к ним извне вызывает SyntaxError.

```js
class BankAccount {
  #balance = 0;
  static #instancesCount = 0;

  constructor(initial) {
    this.#balance = initial;
    BankAccount.#instancesCount++;
  }

  #validate(amount) {
    if (amount <= 0) throw new Error("Invalid amount");
  }

  deposit(amount) {
    this.#validate(amount);
    this.#balance += amount;
    return this.#balance;
  }

  get balance() {
    return this.#balance;
  }

  static get instancesCount() {
    return BankAccount.#instancesCount;
  }
}

const acc = new BankAccount(100);
console.log(acc.balance); // 100
console.log(acc.#balance); // SyntaxError
```

## Особенности статических свойств и методов в классах и их наследование

Статические свойства и методы принадлежат самому классу, а не экземплярам, и наследуются дочерними классами через прототипную цепочку конструкторов — обратиться к родительскому статическому методу можно через `super.method()` внутри статического контекста.

```js
class Shape {
  static count = 0;
  static create(type) {
    Shape.count++;
    return new Shape(type);
  }
  constructor(type) { this.type = type; }
}

class Circle extends Shape {
  static create(radius) {
    const c = super.create("circle");
    c.radius = radius;
    return c;
  }
}

console.log(Object.getPrototypeOf(Circle) === Shape); // true
console.log(Circle.count); // 0 — доступен через наследование статики
```

## Как работает механизм наследования через extends и использование super.

`extends` устанавливает прототипную связь между классами. В конструкторе наследника `super()` обязателен до обращения к `this` — он вызывает конструктор родителя. `super.method()` вызывает метод родителя с текущим `this`.

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}

class Dog extends Animal {
  constructor(name, breed) {
    // console.log(this); // ReferenceError: must call super constructor before accessing 'this'
    super(name);
    this.breed = breed;
  }
  speak() {
    return `${super.speak()} (a ${this.breed})`;
  }
}
```
