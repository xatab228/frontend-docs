# Обеспечение качества — Senior

## Методы тестирования взаимодействия между различными компонентами системы

Тестирование взаимодействия компонентов (integration testing) проверяет, что несколько модулей корректно работают вместе, в отличие от unit-тестов, изолирующих один модуль. Для фронтенда это означает тестирование связки "компонент + стейт-менеджер", "компонент + роутер", "компонент + реальный (не замоканный) HTTP-слой поверх подменённого сервера" через Mock Service Worker, который перехватывает запросы на уровне сетевого слоя, а не подменяет модуль импорта — это делает тест ближе к реальному поведению приложения в браузере.

```tsx
// handlers.ts — MSW перехватывает реальные fetch/axios запросы на уровне сети
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/orders/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, status: 'shipped' });
  }),
];

// OrderPage.integration.test.tsx
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { handlers } from './handlers';
import { OrderPage } from './OrderPage';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('загружает заказ через API и отображает статус', async () => {
  render(<OrderPage orderId="123" />);
  await waitFor(() => expect(screen.getByText('shipped')).toBeInTheDocument());
});
```

На вершине пирамиды тестирования эта идея продолжается полноценными E2E-тестами, симулирующими реальные сценарии использования целиком:

```ts
// checkout.e2e.spec.ts
import { test, expect } from '@playwright/test';

test('пользователь может пройти оформление заказа целиком', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Добавить в корзину' }).first().click();
  await page.getByRole('link', { name: 'Корзина' }).click();
  await page.getByRole('button', { name: 'Оформить заказ' }).click();

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Адрес доставки').fill('ул. Ленина, 1');
  await page.getByRole('button', { name: 'Подтвердить заказ' }).click();

  await expect(page.getByText('Заказ успешно оформлен')).toBeVisible();
});
```

## Особенности тестирования производительности кода с помощью авто-тестов

Автоматизированное тестирование производительности фронтенда фиксирует пороговые значения ключевых метрик (LCP, TBT, bundle size) и проваливает CI, если сборка их превышает — это переносит контроль производительности из разряда "проверим перед релизом вручную" в постоянно работающий автоматический гейт. Особенность в высокой дисперсии результатов замеров (влияние железа CI-раннера, сети), поэтому обычно используют относительные пороги (не более +5% к базовой линии) и несколько прогонов с усреднением, а не абсолютные жёсткие цифры.

```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun --assert.assertions.'"categories:performance"'='["error", {"minScore": 0.9}]'
```
```json
// bundlewatch config — падает в CI, если размер бандла вырос сверх лимита
{
  "files": [{ "path": "dist/main.*.js", "maxSize": "180 kB" }]
}
```

По результатам такого тестирования код оптимизируется — например, типичная оптимизация после сигнала от Lighthouse CI выше — code splitting тяжёлого компонента, не нужного при первой загрузке:

```tsx
// До: тяжёлая библиотека графиков грузится сразу со всем бандлом
import { AnalyticsChart } from './AnalyticsChart';

// После: ленивая загрузка, снижает LCP и initial bundle size
const AnalyticsChart = lazy(() => import('./AnalyticsChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <AnalyticsChart />
    </Suspense>
  );
}
```

## Инструменты нагрузочного тестирования (например, JMeter, Gatling) и тестирования безопасности

JMeter — Java-инструмент с GUI и записью сценариев, широко используется для нагрузочного тестирования HTTP API (в том числе бэкенда, обслуживающего фронтенд); Gatling — Scala-based инструмент с тестами как кодом (DSL), даёт более читаемые отчёты и лучше подходит для CI/CD-интеграции. Для фронтенд-специфичной нагрузки (много одновременных клиентов, тянущих статику/API) применяется k6 — современный инструмент с тестами на JavaScript, который проще интегрировать в существующий фронтенд-тулинг. Тестирование безопасности на этом уровне включает автоматизированные DAST-сканеры (OWASP ZAP), которые прогоняют собранное приложение через набор атак (XSS-инъекции в формы, проверка заголовков безопасности) уже как часть pipeline.

```js
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,            // 50 виртуальных пользователей
  duration: '30s',
};

export default function () {
  const res = http.get('https://staging.example.com/api/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

## Продвинутые анализаторы кода (SonarQube, Coverity и др.)

SonarQube — платформа непрерывного контроля качества, анализирующая код на технический долг (Maintainability Rating), баги (Reliability Rating), уязвимости (Security Rating и Security Hotspots) и дублирование кода, а также отслеживающая метрики отдельно "New Code" (изменения в текущем MR) от исторического кода, что позволяет требовать высокое качество от нового кода, не блокируя весь проект из-за старого легаси. Coverity — коммерческий статический анализатор с упором на глубокий межпроцедурный анализ и поиск сложных дефектов (null pointer dereference, race conditions), исторически сильнее для C/C++/Java, для фронтенд-стека применяется реже, чем SonarQube.

```yaml
# sonar-project.properties
sonar.projectKey=frontend-app
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.tsx,**/*.test.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.qualitygate.wait=true
```
```bash
sonar-scanner
```

На практике такие инструменты настраиваются под требования конкретного проекта, а не применяются с настройками по умолчанию — например, пороги подбираются под зрелость кодовой базы:

```text
# Кастомный Quality Gate для legacy-проекта с частичным покрытием
Coverage on New Code >= 70%       (вместо стандартных 80%, т.к. проект легаси)
Duplicated Lines on New Code < 5%
Blocker Issues = 0
Critical Issues = 0
```

## Техники и инструменты рефакторинга кода

Основные техники по Мартину Фаулеру: Extract Function/Component (выделение части кода в отдельную именованную функцию/компонент для читаемости и переиспользования), Extract Variable (замена сложного выражения именованной переменной), Rename (улучшение имени без изменения поведения), Replace Conditional with Polymorphism (замена ветвлений на полиморфизм при росте числа кейсов), Inline (обратная операция Extract, когда абстракция избыточна). Ключевое условие безопасного рефакторинга — покрытие изменяемого кода тестами до начала рефакторинга, чтобы поведение можно было верифицировать автоматически, а не вручную. Инструменты: встроенный рефакторинг IDE (WebStorm/VSCode с TypeScript Language Server умеет безопасно переименовывать символы во всём проекте и извлекать функции), codemod-скрипты (jscodeshift) для массовых механических изменений по всей кодовой базе.

```ts
// До рефакторинга: длинная функция со смешанной ответственностью
function renderOrderSummary(order: Order) {
  const tax = order.items.reduce((sum, i) => sum + i.price * i.qty, 0) * 0.2;
  const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0) + tax;
  return `Итого: ${total} (налог: ${tax})`;
}

// После Extract Function
function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function calculateTax(subtotal: number): number {
  return subtotal * TAX_RATE;
}

function renderOrderSummary(order: Order) {
  const subtotal = calculateSubtotal(order.items);
  const tax = calculateTax(subtotal);
  return `Итого: ${subtotal + tax} (налог: ${tax})`;
}
```

На практике эти техники применяются через конкретные инструменты — codemod-скрипты для массовых механических изменений по всей кодовой базе:

```bash
# jscodeshift — массовый codemod по всей кодовой базе
npx jscodeshift -t rename-prop-codemod.js src/components/**/*.tsx
```
```ts
// rename-prop-codemod.js — переименовывает проп onClick -> onPress во всех JSX
module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  return j(fileInfo.source)
    .find(j.JSXAttribute, { name: { name: 'onClick' } })
    .forEach(path => { path.node.name.name = 'onPress'; })
    .toSource();
};
```
В WebStorm/VSCode аналогичное переименование одного символа делается через Rename Symbol (F2) — безопасно для всех типизированных использований благодаря TypeScript Language Server.

Эти же техники и инструменты применяются при работе с legacy-кодом и модернизации старой архитектуры, где часто используется стратегия "strangler fig" — постепенная замена легаси-модуля новым, работающим параллельно через общий интерфейс, вместо рискованного одномоментного переписывания:

```tsx
// Старый и новый компонент сосуществуют за feature flag,
// пока новый не покрыт тестами и не проверен на реальном трафике
function OrderForm(props: OrderFormProps) {
  const useNewImplementation = useFeatureFlag('new-order-form');
  return useNewImplementation
    ? <OrderFormV2 {...props} />
    : <LegacyOrderForm {...props} />;
}
```

## Инструменты CI/CD, может описать workflow с точки зрения разработчика

С точки зрения разработчика типичный workflow: push в feature-ветку триггерит pipeline (lint → typecheck → unit-тесты → build), после открытия MR добавляется деплой на review-окружение (динамический preview конкретной ветки) и запуск E2E-тестов против него; после мержа в main пайплайн собирает продакшен-артефакт и деплоит его согласно принятой стратегии (canary/rolling — см. материалы по SDLC). Основные инструменты: GitLab CI (`.gitlab-ci.yml`, стадии и джобы, кэширование между запусками), GitHub Actions (YAML workflow с готовыми actions из маркетплейса), Jenkins (более гибкий, но требует ручного администрирования агентов), CircleCI.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test -- --coverage
      - run: npm run build
```

Настройка автоматизированного запуска тестов дополняет этот пайплайн отдельной стадией для интеграционных тестов из первого раздела (MSW), с кэшированием:

```yaml
integration-tests:
  stage: test
  script:
    - npm ci
    - npm run test:integration -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Принципы настройки и контроля процессов качества

Настройка процессов качества строится на принципе "shift left" — чем раньше в цикле разработки найдена проблема, тем дешевле её исправить, поэтому проверки выстраиваются каскадом: локальный pre-commit хук (быстрый линтер) → pre-push хук (тесты изменённых файлов) → CI pipeline (полный набор проверок и Quality Gate) → мониторинг в продакшене (отслеживание реальных ошибок через Sentry). Контроль подразумевает, что Quality Gate не обходится вручную "в порядке исключения" — если гейт постоянно приходится обходить, значит порог настроен нереалистично и его нужно пересмотреть, а не превращать в формальность.

На практике настройка Quality Gate, блокирующего merge при непрохождении проверок, выглядит так:

```yaml
# .gitlab-ci.yml — job, блокирующий merge при непрохождении Quality Gate
sonarqube-check:
  stage: quality-gate
  image: sonarsource/sonar-scanner-cli:latest
  script:
    - sonar-scanner
  allow_failure: false
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Принципы, лежащие в основе принятия решений о дизайне системы и выбора шаблонов

Решения о дизайне системы должны опираться на реальные нефункциональные требования (ожидаемая нагрузка, требования к доступности, команда и её опыт), а не на моду или личные предпочтения — выбор Module Federation ради независимого деплоя оправдан только при реальной потребности в автономности нескольких команд, а не "потому что это современно". Ключевой принцип — YAGNI (You Aren't Gonna Need It): не вводить абстракцию или паттерн заранее "на будущее", если текущая потребность не подтверждена, поскольку неверно угаданная абстракция дороже в исправлении, чем её отсутствие. Второй принцип — обратимость решения: если решение легко отменить позже (например, выбор конкретной utility-библиотеки), можно решать быстро; если решение труднообратимо (архитектурный стиль, схема данных), стоит выделить больше времени на анализ trade-off'ов.

## Проводить deep-dive reviews, выявляя архитектурные проблемы и подсказывая улучшения

В отличие от обычного ревью (см. Middle), deep-dive review смотрит не на отдельный MR, а на архитектурные последствия изменения для всей системы:

```text
Комментарий в deep-dive review:
Этот MR добавляет прямой импорт из entities/order в entities/user —
это нарушает границы слоёв FSD (entities не должны знать друг о друге)
и создаёт циклическую зависимость. Предлагаю вынести общую логику
в shared/lib или создать отдельный use-case на уровне features,
который будет оркестрировать оба entity.
```
