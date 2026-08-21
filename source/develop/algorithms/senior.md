# Структуры данных и алгоритмы — Senior

### Операции для работы с деревьями и списками

Помимо базовой вставки, на senior-уровне важно владеть полным набором операций: удаление узла из BST (с тремя случаями — узел без потомков, с одним потомком, с двумя потомками, где нужно найти преемника — минимальный элемент правого поддерева), балансировка (AVL, red-black деревья поддерживают высоту O(log n) даже при неудачном порядке вставки, иначе BST вырождается в связный список с O(n) операциями), обходы BFS (в ширину, по уровням, через очередь) и DFS (в глубину, через рекурсию или стек, разные порядки — pre-order/in-order/post-order). Для связных списков — разворот списка, обнаружение цикла (алгоритм Флойда, "черепаха и заяц"), слияние двух отсортированных списков.

```ts
// Удаление узла из BST — самый сложный случай (два потомка)
function deleteNode(root: TreeNode | null, value: number): TreeNode | null {
  if (!root) return null;
  if (value < root.value) { root.left = deleteNode(root.left, value); return root; }
  if (value > root.value) { root.right = deleteNode(root.right, value); return root; }

  // найден узел на удаление
  if (!root.left) return root.right;
  if (!root.right) return root.left;

  // два потомка: находим минимальный узел правого поддерева (преемник)
  let successor = root.right;
  while (successor.left) successor = successor.left;
  root.value = successor.value;
  root.right = deleteNode(root.right, successor.value);
  return root;
}

// Обход в ширину (BFS) через очередь
function bfs(root: TreeNode | null): number[] {
  const result: number[] = [];
  if (!root) return result;
  const queue: TreeNode[] = [root];
  while (queue.length) {
    const node = queue.shift()!;
    result.push(node.value);
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return result;
}

// Обнаружение цикла в связном списке — алгоритм Флойда
function hasCycle(head: ListNode<unknown> | null): boolean {
  let slow = head;
  let fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true; // "заяц" догнал "черепаху" — есть цикл
  }
  return false;
}
```

Демонстрация полного цикла на прикладной задаче — рендер дерева комментариев с сортировкой по дате, где используются и обход, и вставка из примеров выше:

```ts
interface Comment {
  id: number;
  text: string;
  createdAt: number;
  children: Comment[];
}

function flattenCommentsSortedByDate(comments: Comment[]): Comment[] {
  const result: Comment[] = [];
  function dfs(node: Comment) {
    result.push(node);
    // сортируем детей перед обходом — комбинация DFS и сортировки
    [...node.children].sort((a, b) => a.createdAt - b.createdAt).forEach(dfs);
  }
  [...comments].sort((a, b) => a.createdAt - b.createdAt).forEach(dfs);
  return result;
}
```

### Выбирать наиболее подходящий алгоритм сортировки и поиска в зависимости от типа данных, объема сортируемых элементов и других факторов

Для маленьких массивов (< 10-20 элементов) простые O(n²) сортировки типа insertion sort часто быстрее на практике, чем асимптотически лучшие merge/quick sort, из-за меньших констант и отсутствия overhead рекурсии — поэтому движки JS (V8) сами переключаются на insertion sort для маленьких подмассивов внутри `Array.prototype.sort`. Для больших объёмов данных нужна стабильность (сохранение порядка равных элементов, важно, например, при сортировке таблицы по нескольким колонкам последовательно) — тогда выбирают merge sort, который стабилен по определению, в отличие от обычного quick sort.

```ts
// V8's Array.prototype.sort уже оптимален для большинства случаев,
// но если нужна гарантированная стабильность на больших данных — merge sort вручную
function mergeSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);
  return merge(left, right, compare);
}

function merge<T>(left: T[], right: T[], compare: (a: T, b: T) => number): T[] {
  const result: T[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    // при равенстве берём левый элемент первым — гарантия стабильности
    if (compare(left[i], right[j]) <= 0) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}
```

### Способы ограничения скорости передачи данных (rate limiting)

Rate limiting — механизм, ограничивающий число операций (запросов к API, событий) за единицу времени, чтобы защитить систему от перегрузки. Основные алгоритмы:

- **Fixed window** — счётчик сбрасывается в начале каждого фиксированного интервала. Просто, но допускает всплеск до 2× лимита на границе окон.
- **Sliding window** — учитывает скользящее окно времени: точнее fixed window, но сложнее в реализации.
- **Token bucket** — в «ведро» фиксированной ёмкости с постоянной скоростью добавляются токены, каждый запрос тратит один. Допускает всплески до размера ведра при ограниченной средней скорости.
- **Leaky bucket** — запросы попадают в очередь фиксированного размера и обрабатываются с постоянной скоростью: сглаживает всплески, но не пропускает их.

Фронтенд-разработчик сталкивается с rate limiting с обеих сторон: троттлит собственные запросы, чтобы не словить 429, и учитывает внешние лимиты чужих API.

```ts
// Простой rate limiter на основе fixed window — для клиентского троттлинга запросов
class FixedWindowLimiter {
  private count = 0;
  private windowStart = Date.now();
  constructor(private limit: number, private windowMs: number) {}

  allow(): boolean {
    const now = Date.now();
    if (now - this.windowStart >= this.windowMs) {
      this.windowStart = now;
      this.count = 0;
    }
    if (this.count >= this.limit) return false;
    this.count++;
    return true;
  }
}
```

Простейший вариант без сложных алгоритмов — счётчик с искусственной задержкой между операциями, применимый, например, к последовательной пачке запросов к API, чтобы не превысить лимит провайдера:

```ts
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processWithSimpleLimit<T>(
  items: T[],
  maxPerSecond: number,
  handler: (item: T) => Promise<void>,
): Promise<void> {
  let processedInWindow = 0;
  for (const item of items) {
    await handler(item);
    processedInWindow++;
    if (processedInWindow >= maxPerSecond) {
      await sleep(1000); // простой sleep вместо fixed/sliding window
      processedInWindow = 0;
    }
  }
}
```

### Способы профилирования и анализа производительности

На фронтенде профилирование выполняется несколькими инструментами на разных уровнях: React DevTools Profiler показывает время рендера каждого компонента и причину ре-рендера; вкладка Performance в Chrome DevTools записывает полную временную шкалу (JS execution, layout, paint, composite) и позволяет найти "long tasks", блокирующие главный поток; Lighthouse и Web Vitals (LCP, INP, CLS) дают агрегированные метрики реального пользовательского опыта; `console.time`/`performance.mark` — точечные измерения конкретных участков кода в продакшене.

```ts
// Точечное профилирование через Performance API
performance.mark('search-start');
const results = binarySearch(sortedArr, target);
performance.mark('search-end');
performance.measure('search-duration', 'search-start', 'search-end');

const [measure] = performance.getEntriesByName('search-duration');
console.log(`Поиск занял ${measure.duration.toFixed(2)} ms`);
```

Практический анализ — не просто знание Big O теоретически, а измерение реальной разницы на конкретных данных, чтобы подтвердить или опровергнуть теоретическую оценку:

```ts
function benchmark(fn: () => void, label: string): void {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  console.log(`${label}: ${duration.toFixed(2)} ms`);
}

const bigArray = Array.from({ length: 100_000 }, (_, i) => i);

benchmark(() => linearSearch(bigArray, 99_999), 'linearSearch O(n)');
benchmark(() => binarySearch(bigArray, 99_999), 'binarySearch O(log n)');
// на 100 000 элементах разница будет на порядки — наглядное подтверждение теории
```
