# Структуры данных и алгоритмы — Staff

## Алгоритмы ограничения частоты операций (leaky bucket, token bucket)

Token bucket и leaky bucket — два наиболее распространённых промышленных алгоритма rate limiting, различающихся поведением при всплесках трафика.

**Token bucket.** В «ведро» с постоянной скоростью (refill rate) добавляются токены до максимума (capacity); каждый запрос потребляет токен, при пустом ведре запрос отклоняется. Ключевое свойство — накопленные во время затишья токены можно потратить разом, пропустив кратковременный всплеск до размера ведра, при этом средняя скорость за длительный период остаётся ограниченной.

**Leaky bucket.** Очередь фиксированного размера, из которой запросы «вытекают» с постоянной скоростью независимо от темпа поступления; при переполнении новые запросы отбрасываются. В отличие от token bucket, сглаживает трафик до строго постоянной скорости и не пропускает всплески вообще — это критично, если downstream-система (например, легаси API) физически не выдерживает пачку запросов.

```ts
// Token Bucket — допускает всплески до capacity, в среднем ограничивает refillRate
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRatePerSec: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSec * this.refillRatePerSec;
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  tryConsume(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}

// Leaky Bucket — строго постоянная скорость обработки, очередь фиксированного размера
class LeakyBucket<T> {
  private queue: T[] = [];
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private capacity: number,
    leakIntervalMs: number,
    private onLeak: (item: T) => void,
  ) {
    this.timer = setInterval(() => {
      const item = this.queue.shift();
      if (item !== undefined) this.onLeak(item); // обработка с постоянным темпом
    }, leakIntervalMs);
  }

  tryAdd(item: T): boolean {
    if (this.queue.length >= this.capacity) return false; // ведро переполнено
    this.queue.push(item);
    return true;
  }

  dispose(): void {
    clearInterval(this.timer);
  }
}
```

На практике эффективное управление частотой операций часто означает комбинацию token bucket с очередью отложенных запросов — практичный паттерн для клиента, который не должен терять запросы при превышении лимита, а откладывать их до появления токенов:

```ts
class RateLimitedQueue<T> {
  private bucket: TokenBucket;
  private pending: (() => void)[] = [];

  constructor(capacity: number, refillRatePerSec: number) {
    this.bucket = new TokenBucket(capacity, refillRatePerSec);
    setInterval(() => this.drain(), 100); // периодически пробуем разгрузить очередь
  }

  private drain(): void {
    while (this.pending.length && this.bucket.tryConsume()) {
      const task = this.pending.shift();
      task?.();
    }
  }

  schedule(task: () => void): void {
    if (this.bucket.tryConsume()) task();
    else this.pending.push(task); // токенов нет — откладываем, а не отбрасываем
  }
}
```

## Принципы проектирования, разработки и оптимизации высокопроизводительных алгоритмов с минимальными затратами

На staff-уровне оптимизация — системный процесс, а не разовая правка функции. Порядок шагов:

1. **Профилирование.** Найти реальное узкое место (см. Performance API из Senior-уровня), а не оптимизировать «на глаз»: интуитивные предположения о том, что медленно, часто ошибочны.
2. **Асимптотика доминирующей операции.** Замена O(n²) на O(n log n) даёт больше выигрыша, чем любая микрооптимизация константы.
3. **Константы и особенности среды.** Для JS — не менять форму объекта после создания (скрытые классы V8), избегать лишних аллокаций в горячих путях, использовать типизированные массивы (`Float64Array`, `Int32Array`) для больших числовых вычислений.
4. **Оценка trade-off.** Кастомный высокооптимизированный алгоритм оправдан там, где даёт измеримый эффект для пользователя (например, влияет на Web Vitals), а не там, где это «интересная задача».

```ts
// Пример: оптимизация горячего пути с типизированным массивом
// Обычный массив: боксинг чисел, непредсказуемый layout в памяти
function sumRegularArray(arr: number[]): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) total += arr[i];
  return total;
}

// Float64Array: непрерывная область памяти, без боксинга — быстрее на больших объёмах
function sumTypedArray(arr: Float64Array): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) total += arr[i];
  return total;
}

// Стабильный "shape" объекта — V8 может оптимизировать доступ к полям
class Point {
  constructor(public x: number, public y: number) {} // поля заданы один раз, не меняются динамически
}
```

Пример разработки и оптимизации кастомной структуры данных: собственная структура для быстрого поиска ближайшей точки на карте (используется, например, в UI с геолокацией) — сочетание идей про деревья и производительность. Наивный перебор всех точек — O(n) на каждый запрос; для многократных запросов эффективнее k-d дерево, дающее в среднем O(log n):

```ts
interface Point2D { x: number; y: number; }

class KDNode {
  point: Point2D;
  left: KDNode | null = null;
  right: KDNode | null = null;
  constructor(point: Point2D) { this.point = point; }
}

class KDTree {
  root: KDNode | null = null;

  build(points: Point2D[], depth = 0): KDNode | null {
    if (points.length === 0) return null;
    const axis = depth % 2 === 0 ? 'x' : 'y'; // чередуем ось деления
    const sorted = [...points].sort((a, b) => a[axis] - b[axis]);
    const medianIdx = Math.floor(sorted.length / 2);
    const node = new KDNode(sorted[medianIdx]);
    node.left = this.build(sorted.slice(0, medianIdx), depth + 1);
    node.right = this.build(sorted.slice(medianIdx + 1), depth + 1);
    return node;
  }
}
```

Полный цикл измерения и улучшения производительности на staff-уровне выглядит так: бенчмарк на реалистичных данных (не синтетических), профилирование для локализации узкого места, целевая оптимизация, повторный замер для подтверждения эффекта:

```ts
function compareImplementations() {
  const dataset = Array.from({ length: 50_000 }, () => Math.random());

  console.time('naive-dedup');
  const naiveResult = [...new Set(dataset)]; // O(n) через встроенный Set
  console.timeEnd('naive-dedup');

  console.time('typed-array-sum');
  const typed = Float64Array.from(dataset);
  sumTypedArray(typed);
  console.timeEnd('typed-array-sum');
}
```

Результаты замеров документируются (например, в PR-описании с числами "до/после"), чтобы решение об оптимизации было основано на данных, а не на предположениях — это и есть системный подход к производительности, отличающий staff-инженера от точечных локальных правок.
