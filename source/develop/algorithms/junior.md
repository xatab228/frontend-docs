# Структуры данных и алгоритмы — Junior

### Основные структуры данных (массивы, списки, связные списки, очереди, стеки)

Массив (array) — упорядоченная коллекция элементов с доступом по индексу за O(1), но с O(n) на вставку/удаление в середину, так как последующие элементы нужно сдвигать. Список (list) в контексте JS обычно означает тот же массив, используемый как динамическая структура переменного размера. Связный список (linked list) состоит из узлов, каждый из которых хранит значение и ссылку на следующий узел — вставка и удаление в начале O(1), но доступ по индексу O(n), так как нужно пройти по цепочке ссылок. Очередь (queue) — структура FIFO (First In, First Out): элементы добавляются в конец и извлекаются из начала, как очередь в магазине. Стек (stack) — структура LIFO (Last In, First Out): последний добавленный элемент извлекается первым, как стопка тарелок.

```ts
// Связный список — базовая реализация
class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

class LinkedList<T> {
  head: ListNode<T> | null = null;

  push(value: T): void {
    const node = new ListNode(value);
    if (!this.head) {
      this.head = node;
      return;
    }
    let current = this.head;
    while (current.next) current = current.next;
    current.next = node;
  }
}

// Стек и очередь на основе массива
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); } // LIFO
}

class Queue<T> {
  private items: T[] = [];
  enqueue(item: T): void { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); } // FIFO
}
```

Выбор структуры данных на практике должен опираться на то, какая операция выполняется чаще всего. Если нужен частый произвольный доступ по индексу — подходит массив (`arr[i]`, O(1)). Если частые вставки/удаления в начало — связный список (`LinkedList.push` со ссылкой на head, O(1)) эффективнее массива, где `arr.unshift()` требует сдвига всех элементов, O(n). Если нужна обработка задач "в порядке поступления" (например, очередь запросов на загрузку файлов) — подходит `Queue` из примера выше. Если нужен откат последнего действия (undo-стек в текстовом редакторе, история переходов "назад" в браузере) — подходит `Stack`.

```ts
// Пример: история действий для undo в UI-редакторе — классический сценарий для стека
class UndoManager<T> {
  private history = new Stack<T>();

  recordAction(state: T): void {
    this.history.push(state);
  }

  undo(): T | undefined {
    return this.history.pop(); // последнее действие отменяется первым — LIFO
  }
}
```

### Несколько простых алгоритмов сортировки (пузырьком, шейкерная, расческой, вставками, выбором и др.)

- **Пузырьком (bubble sort)** — многократно проходит по массиву, меняя местами соседние элементы, стоящие в неправильном порядке. O(n²), простая, но неэффективная на больших данных.
- **Шейкерная (cocktail sort)** — модификация пузырьковой с проходами попеременно в обе стороны, чуть быстрее сходится на частично отсортированных данных.
- **Расчёской (comb sort)** — сравнивает элементы с уменьшающимся промежутком (gap), а не только соседние, чем убирает «черепах» — маленькие значения в конце массива.
- **Вставками (insertion sort)** — строит отсортированную часть слева направо, вставляя каждый следующий элемент на нужную позицию. Эффективна на почти отсортированных данных, в среднем O(n²).
- **Выбором (selection sort)** — на каждом проходе находит минимум в оставшейся части и меняет его с текущей позицией. Всегда O(n²), но делает минимум перестановок.

```ts
// Сортировка пузырьком
function bubbleSort(arr: number[]): number[] {
  const result = [...arr];
  for (let i = 0; i < result.length - 1; i++) {
    for (let j = 0; j < result.length - 1 - i; j++) {
      if (result[j] > result[j + 1]) {
        [result[j], result[j + 1]] = [result[j + 1], result[j]];
      }
    }
  }
  return result;
}

// Сортировка вставками
function insertionSort(arr: number[]): number[] {
  const result = [...arr];
  for (let i = 1; i < result.length; i++) {
    const current = result[i];
    let j = i - 1;
    while (j >= 0 && result[j] > current) {
      result[j + 1] = result[j];
      j--;
    }
    result[j + 1] = current;
  }
  return result;
}

// Сортировка выбором
function selectionSort(arr: number[]): number[] {
  const result = [...arr];
  for (let i = 0; i < result.length - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < result.length; j++) {
      if (result[j] < result[minIndex]) minIndex = j;
    }
    if (minIndex !== i) [result[i], result[minIndex]] = [result[minIndex], result[i]];
  }
  return result;
}
```

### Понятие алгоритмической сложности (Big O notation)

Big O notation — способ описать, как растёт время выполнения (или потребление памяти) алгоритма в зависимости от размера входных данных `n`, при этом опуская константы и менее значимые слагаемые, так как интересует поведение на больших `n`. Например, O(n) означает, что время выполнения растёт линейно с ростом данных (пройти по массиву один раз), а O(n²) — что при удвоении данных время растёт вчетверо (вложенные циклы, как в сортировке пузырьком выше). Big O описывает худший случай (worst case) по умолчанию, если не указано иное, и позволяет сравнивать алгоритмы независимо от конкретного железа, на котором они выполняются.

```ts
// O(1) — константное время, не зависит от размера массива
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

// O(n) — линейное время, один проход
function sum(arr: number[]): number {
  let total = 0;
  for (const n of arr) total += n; // n итераций
  return total;
}

// O(n^2) — квадратичное время, вложенный цикл
function hasDuplicates(arr: number[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) return true;
    }
  }
  return false;
}
```
