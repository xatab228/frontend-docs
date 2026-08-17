# Структуры данных и алгоритмы — Middle

### Продвинутые структуры данных (деревья, словари/хеш-таблицы)

Дерево — иерархическая структура из узлов, где каждый узел имеет одного родителя (кроме корня) и произвольное число потомков; частный случай — бинарное дерево, где у узла не более двух потомков, а бинарное дерево поиска (BST) дополнительно поддерживает инвариант "левый потомок меньше родителя, правый — больше", что даёт поиск за O(log n) на сбалансированном дереве. DOM в браузере — реальный пример дерева, с которым фронтенд-разработчик работает ежедневно. Хеш-таблица (в JS — `Map`/`Object`) хранит пары ключ-значение и вычисляет позицию элемента через хеш-функцию от ключа, что даёт в среднем O(1) на вставку, поиск и удаление независимо от размера коллекции — за счёт этого, например, объект `{}` в JS используется как быстрый способ проверки "встречалось ли уже такое значение".

```ts
// Бинарное дерево поиска
class TreeNode {
  value: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(value: number) {
    this.value = value;
  }
}

class BST {
  root: TreeNode | null = null;

  insert(value: number): void {
    const node = new TreeNode(value);
    if (!this.root) {
      this.root = node;
      return;
    }
    let current = this.root;
    while (true) {
      if (value < current.value) {
        if (!current.left) { current.left = node; return; }
        current = current.left;
      } else {
        if (!current.right) { current.right = node; return; }
        current = current.right;
      }
    }
  }
}

// Хеш-таблица для быстрой проверки на дубликаты — O(n) вместо O(n^2)
function hasDuplicatesFast(arr: number[]): boolean {
  const seen = new Map<number, boolean>();
  for (const n of arr) {
    if (seen.has(n)) return true;
    seen.set(n, true);
  }
  return false;
}
```

Помимо базовой вставки, на практике часто нужен обход дерева — например, для рендера вложенного меню или дерева комментариев.

```ts
// Обход BST в порядке возрастания (in-order traversal)
function inOrderTraversal(node: TreeNode | null, result: number[] = []): number[] {
  if (!node) return result;
  inOrderTraversal(node.left, result);
  result.push(node.value);
  inOrderTraversal(node.right, result);
  return result;
}
```

### Принцип работы линейных и двоичных алгоритмов поиска, различия и области применения

Линейный поиск (linear search) последовательно проверяет каждый элемент массива до совпадения — O(n), но работает на любых, в том числе неотсортированных, данных. Двоичный поиск (binary search) требует отсортированный массив: на каждом шаге сравнивает искомое значение со средним элементом и отбрасывает половину диапазона поиска — O(log n), что при 1 000 000 элементов означает порядка 20 сравнений вместо миллиона. Выбор зависит от данных: если массив нужно искать один раз и он не отсортирован — сортировка ради одного двоичного поиска не окупится, проще линейный поиск; если поиск выполняется многократно по одним и тем же (или уже отсортированным) данным — двоичный поиск существенно выгоднее.

```ts
function linearSearch(arr: number[], target: number): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}

function binarySearch(sortedArr: number[], target: number): number {
  let low = 0;
  let high = sortedArr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedArr[mid] === target) return mid;
    if (sortedArr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}
```

Адаптация под ситуацию означает выбор не "любого" алгоритма, а подходящего под характер данных: для почти отсортированного массива (например, добавление одного нового элемента в уже отсортированный список задач) insertion sort эффективнее на практике, чем асимптотически более быстрый, но с большими константами алгоритм, потому что insertion sort вырождается в O(n) на почти готовых данных. Для поиска — если данные уже отсортированы (как список ID пользователей из БД), используется `binarySearch` вместо `linearSearch`, что и демонстрирует адаптацию алгоритма под конкретный кейс.

### Разницу между временными и пространственными характеристиками алгоритмов

Временная сложность (time complexity) описывает, как растёт число операций алгоритма с ростом объёма входных данных. Пространственная сложность (space complexity) описывает, сколько дополнительной памяти алгоритм потребляет сверх входных данных — например, для рекурсии учитывается глубина стека вызовов, а для сортировки — используется ли дополнительный массив или сортировка выполняется "на месте" (in-place). Часто между временем и памятью есть компромисс: мемоизация (кэширование промежуточных результатов) ускоряет алгоритм за счёт роста потребления памяти — классический пример trade-off.

```ts
// O(n) по времени, O(1) по памяти — in-place, без доп. массива
function reverseInPlace(arr: number[]): void {
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++;
    right--;
  }
}

// O(n) по времени, O(n) по памяти — trade-off: тратим память ради простоты/immutability
function reverseCopy(arr: number[]): number[] {
  return [...arr].reverse();
}
```

### Классы сложности алгоритмов (O(1), O(log n), O(n), O(n^2) и т.д.)

Основная шкала от лучшей к худшей: O(1) константа — доступ к элементу `Map` по ключу; O(log n) логарифмическая — двоичный поиск, каждый шаг отбрасывает половину данных; O(n) линейная — один проход по массиву; O(n log n) — эффективные сортировки (merge sort, quick sort в среднем случае), сочетание разбиения (log n уровней) и слияния (n операций на уровень); O(n²) квадратичная — вложенные циклы по одним и тем же данным, как в bubble sort; O(2ⁿ) экспоненциальная — например, наивная рекурсивная реализация чисел Фибоначчи без мемоизации, где число вызовов удваивается с каждым увеличением n на единицу.

```ts
// O(2^n) — наивная рекурсия, каждый вызов порождает 2 новых
function fibNaive(n: number): number {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// O(n) — та же задача с мемоизацией (тот самый time/space trade-off)
function fibMemo(n: number, memo = new Map<number, number>()): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

Оценка сложности напрямую определяет выбор структуры данных на практике. Например, при подсчёте частоты слов в тексте наивный подход без хеш-таблицы даёт O(n²): для каждого слова приходится искать его в массиве результатов.

```ts
// Наивно (без хеш-таблицы) — O(n^2): для каждого слова ищем его в массиве результатов
function wordFrequencyNaive(words: string[]): { word: string; count: number }[] {
  const result: { word: string; count: number }[] = [];
  for (const word of words) {
    const existing = result.find((r) => r.word === word); // O(n) поиск на каждой итерации
    if (existing) existing.count++;
    else result.push({ word, count: 1 });
  }
  return result;
}

// С Map — O(n): вставка и поиск по ключу за O(1)
function wordFrequencyFast(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return freq;
}
```

Выбор `Map` вместо массива пар здесь — прямое следствие анализа сложности: O(n) кардинально лучше O(n²) уже на текстах в несколько тысяч слов.
