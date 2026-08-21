# Основы JavaScript — Junior

## Примитивные и ссылочные типы

Примитивы (number, string, boolean, null, undefined, symbol, bigint) хранятся по значению и неизменяемы. Ссылочные типы (объекты, массивы, функции) хранятся по ссылке — переменная содержит адрес в памяти, поэтому копирование переменной копирует ссылку, а не сами данные.

## Разницу между примитивами и объектами, typeof, особенности typeof null

`typeof` возвращает строку с типом значения. Для объектов и массивов возвращается `"object"`, для функций — `"function"`. Историческая ошибка языка: `typeof null === "object"`, хотя null — примитив.

```js
typeof 42;          // "number"
typeof 10n;          // "bigint"
typeof "s";          // "string"
typeof true;         // "boolean"
typeof undefined;    // "undefined"
typeof Symbol();     // "symbol"
typeof {};           // "object"
typeof [];           // "object"  (массивы — объекты)
typeof function(){}; // "function" (функции — вызываемые объекты, но typeof для них особый случай)
typeof null;         // "object"  !!!
```

## Унарные, бинарные и логические операторы, приведение типов в выражениях

Унарные операторы (`+x`, `-x`, `++`, `!`) работают с одним операндом, бинарные (`+`, `-`, `*`, `==`) — с двумя. При смешении типов в выражении JS неявно приводит операнды к общему типу — часто к числу или строке, что может давать неожиданные результаты.

```js
let x = 5;
console.log(x++); // 5 — вернёт СТАРОЕ значение, потом увеличит
console.log(x);   // 6
console.log(++x); // 7 — сначала увеличит, потом вернёт

let total = 0, i = 0;
const items = [10, 20, 30];
while (i < items.length) {
  total += items[i++];
}
console.log(total, i); // 60 3

let price = 100;
price += 10;  // 110
price *= 2;   // 220
price %= 7;   // 220 % 7 = 3
```

```js
1 + "1";      // "11"
1 + {};       // "1[object Object]"
[] + [];      // ""
[] + {};      // "[object Object]"
true + true;  // 2
"5" - 2;      // 3 (минус всегда числовой)
"5" * "2";    // 10
```

## Сравнения: == vs ===, поведение null и undefined

`===` сравнивает без приведения типов, `==` перед сравнением приводит операнды к общему типу. Особый случай: `null == undefined` истинно, но `null === undefined` ложно, и оба они не равны никаким другим falsy значениям через `==`.

```js
null == undefined;   // true
null === undefined;  // false
0 == false;           // true
0 === false;          // false
"" == 0;              // true
[] == false;          // true ([] -> "" -> 0)
[] == "";              // true
NaN == NaN;            // false
```

Практическое правило хорошего тона: всегда использовать `===`, кроме единственного идиоматичного случая `x == null` для одновременной проверки на `null` и `undefined`.

## 7 ложных значений

В JavaScript ровно 7 falsy-значений: `false`, `0`, `-0`, `""`, `null`, `undefined`, `NaN`. Все остальные значения, включая пустые объекты и массивы `{}`/`[]`, являются truthy.

## Условные конструкции и их использование

`if/else` используется для ветвления логики, тернарный оператор `?:` — для компактного выбора значения. Их можно вкладывать друг в друга для многоступенчатых проверок.

```js
function getDiscount(user) {
  if (user.isVip) {
    return user.yearsActive > 5 ? 0.3 : 0.2;
  } else if (user.hasCoupon) {
    return user.couponType === "premium" ? 0.15 : 0.05;
  } else {
    return 0;
  }
}

console.log(getDiscount({ isVip: true, yearsActive: 6 }));   // 0.3
console.log(getDiscount({ hasCoupon: true, couponType: "premium" })); // 0.15
console.log(getDiscount({}));                                 // 0
```

Логические операторы `||`, `&&`, `!`, `??` используются не только для булевых проверок, но и для короткого замыкания (short-circuit) при присваивании значений по умолчанию. `||` срабатывает на любое falsy, `??` — только на `null`/`undefined`.

```js
function renderUser(config = {}) {
  const name = config.name || "Гость";
  const limit = config.limit ?? 10;
  const isAdmin = !!config.roles && config.roles.includes("admin");

  config.debug && console.log(`Rendering ${name}, limit=${limit}, admin=${isAdmin}`);
  return { name, limit, isAdmin };
}

console.log(renderUser({ limit: 0, debug: true }));
// name: "Гость", limit: 0 (не перезаписан, т.к. ?? реагирует только на null/undefined)
```

## Различия между видами функций, их области применения

Function declaration поднимается (hoisting) целиком и доступна до объявления. Function expression доступна только после присваивания. Стрелочные функции не имеют своего `this`, используют лексический `this` внешней области. Методы классов не enumerable.

```js
function decl() {}               // hoisted полностью
const expr = function () {};     // hoisted только объявление переменной
const arrow = () => {};          // this лексический
class C { method() {} }          // метод класса, не enumerable
```

## Основные циклы и операторы выбора, их назначение

`for`, `while`, `for...in` (перебор ключей, индексы как строки), `for...of` (перебор значений итерируемых объектов) применяются для обхода структур данных. Обычные объекты не итерируемы через `for...of`.

```js
const arr = [10, 20, 30];
for (const i in arr) console.log(typeof i); // "string" — индексы как строки
for (const v of arr) console.log(v);         // 10, 20, 30 — значения

const obj = { a: 1, b: 2 };
for (const key in obj) console.log(key); // "a", "b"
// for (const v of obj) — TypeError: obj is not iterable
```

## Методы массивов: map, filter, reduce, find, slice, concat, sort, forEach — поведение, мутация, возврат

`map`, `filter`, `slice`, `concat` возвращают новый массив, не мутируя исходный. `sort` и `reverse` мутируют массив на месте. `find` возвращает первый подходящий элемент или undefined. `reduce` сворачивает массив в одно значение. `forEach` ничего не возвращает и используется только ради побочных эффектов.

## Понятие областей видимости переменных

Область видимости определяет, где переменная доступна. `var` имеет функциональную область видимости, `let`/`const` — блочную. Переменные, объявленные во внешней области, доступны во вложенных функциях.

## Общее понимание замыканий и цепочки областей видимости (scope chain)

Замыкание — это функция, которая сохраняет доступ к переменным своей внешней области видимости даже после того, как та область завершила выполнение. Поиск переменной идёт по цепочке областей видимости от внутренней к внешней.

```js
function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2 — count "живёт" между вызовами
```

## Роль глобального объекта и поведение this в глобальной области

Глобальный объект (`window` в браузере, `global` в Node) хранит глобальные переменные и функции. В глобальном контексте `this` указывает на глобальный объект; внутри обычной функции (non-strict) `this` также ссылается на глобальный объект, а в strict mode — `undefined`.

```js
console.log(this === window); // true, в браузере, non-strict script

function regularFn() {
  console.log(this); // window (non-strict) или undefined (strict mode)
}
regularFn();
```

## Жизненный цикл Promise и принципы работы с его методами

Promise проходит через состояния pending → fulfilled/rejected. `.then()` обрабатывает успешное выполнение, `.catch()` — ошибку, `.finally()` выполняется в любом случае. Методы можно чейнить, каждый возвращает новый Promise.

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve("done"), 1000);
});

p.then(value => console.log(value))
 .catch(err => console.error(err))
 .finally(() => console.log("cleanup"));
```

## Синтаксис async/await: синтаксис

`async` перед функцией делает её асинхронной и заставляет всегда возвращать Promise. `await` внутри такой функции приостанавливает выполнение до разрешения промиса, позволяя писать асинхронный код в синхронном стиле.

## Обработку ошибок через try...catch

`try...catch` перехватывает исключения, возникшие в блоке `try`, позволяя обработать их в `catch` без падения программы. Блок `finally` выполняется всегда, независимо от того, было исключение или нет.
