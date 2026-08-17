# Работа с инструментами ИИ — Staff

### Принципы устройства инструментов и плагинов для интеграции ИИ, LLM и агентов, MCP (Model Context Protocol)

MCP (Model Context Protocol) — открытый протокол, стандартизирующий, как LLM-агенты подключаются к внешним источникам данных и инструментам (файловой системе, API, базам данных, браузеру) через единый интерфейс "клиент-сервер", вместо того чтобы каждый инструмент интегрировался с моделью по-своему. MCP-сервер описывает набор доступных ему функций (tools) со схемой параметров в формате JSON Schema, а клиент (например, IDE-агент) на каждом шаге решает, какой инструмент вызвать, передаёт параметры и получает структурированный результат обратно в контекст диалога. Такая архитектура позволяет переиспользовать один и тот же MCP-сервер (например, для работы с GitHub) в разных агентах и продуктах без переписывания интеграции.

```ts
// Упрощённый пример MCP tool-сервера на TypeScript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({ name: 'jira-tools', version: '1.0.0' });

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'create_issue',
    description: 'Создаёт задачу в Jira',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        projectKey: { type: 'string' },
      },
      required: ['title', 'projectKey'],
    },
  }],
}));

server.setRequestHandler('tools/call', async (req) => {
  if (req.params.name === 'create_issue') {
    const { title, projectKey } = req.params.arguments as { title: string; projectKey: string };
    const issue = await jiraClient.createIssue({ title, projectKey });
    return { content: [{ type: 'text', text: `Создана задача ${issue.key}` }] };
  }
});
```

### Основные подходы к обучению моделей

На уровне понимания, необходимом фронтенд-архитектору для принятия решений об интеграции (а не разработке моделей с нуля), важно различать: pre-training — обучение базовой модели на огромном корпусе текста с нуля, ресурсоёмкая задача уровня крупных лабораторий; fine-tuning — дообучение уже готовой модели на узком специализированном датасете (например, стиль код-ревью конкретной компании), требует значительно меньше ресурсов; RLHF (Reinforcement Learning from Human Feedback) — уточнение поведения модели через обратную связь людей, ранжирующих ответы; и few-shot/in-context learning — вообще без изменения весов модели, просто передача нескольких примеров прямо в промпте, что на практике самый доступный способ "настроить" поведение модели для конкретной задачи фронтенд-команды.

```ts
// Few-shot подход — самый практичный для интеграции в продукт без обучения моделей
const fewShotPrompt = `
Пример 1: "Кнопка не кликается" → категория: UI Bug
Пример 2: "Медленно грузится дашборд" → категория: Performance
Пример 3: "Хочу тёмную тему" → категория: Feature Request

Классифицируй: "После логина белый экран"
`;
```

### Принципы построения ИИ Workflow

ИИ-workflow — это оркестрация нескольких шагов и/или нескольких моделей/агентов, где выход одного шага становится входом следующего, с точками принятия решений и, при необходимости, вмешательством человека (human-in-the-loop). Ключевые принципы: декомпозиция сложной задачи на атомарные шаги (аналогично Chain of Thoughts, но на уровне системы, а не одного промпта), явные контракты между шагами (структурированный вывод — JSON, а не свободный текст, чтобы следующий шаг мог его надёжно распарсить), обработка ошибок и fallback на каждом шаге (модель может вернуть невалидный результат), и точки останова для проверки человеком там, где цена ошибки высока.

```ts
// Пример workflow: автогенерация PR-описания -> проверка -> публикация
type WorkflowStep<I, O> = (input: I) => Promise<O>;

const generateSummary: WorkflowStep<string, string> = async (diff) =>
  callModel(`Опиши изменения кратко:\n${diff}`);

const validateSummary: WorkflowStep<string, { valid: boolean; text: string }> = async (summary) => {
  const isEmpty = summary.trim().length === 0;
  return { valid: !isEmpty, text: summary };
};

async function runPRDescriptionWorkflow(diff: string) {
  const summary = await generateSummary(diff);
  const validated = await validateSummary(summary);
  if (!validated.valid) throw new Error('AI сгенерировал пустое описание, нужен ручной ввод');
  return validated.text;
}
```

## Практика (УМЕЕТ)

### Интегрировать ИИ в рабочие процессы и CI/CD-пайплайны

На уровне staff это значит проектировать не разовый скрипт, а устойчивый пайплайн: MCP-сервер или API-вызов встраивается в CI как отдельный job с ограничением по времени и стоимости, результат работы ИИ (например, сгенерированный changelog) публикуется как артефакт или комментарий к PR, а не применяется автоматически без проверки — прямое развитие примера с AI code review из Senior-раздела, но уже с полноценным workflow из нескольких этапов и обработкой ошибок, как описано в разделе про ИИ Workflow.

```yaml
# .github/workflows/ai-changelog.yml
name: AI Changelog
on:
  push:
    tags: ['v*']
jobs:
  generate-changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: node scripts/ai-workflow/generate-changelog.mjs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: actions/upload-artifact@v4
        with: { name: changelog, path: CHANGELOG.generated.md }
```

### Определять стандарты и практики использования ИИ и агентов

Staff-инженер формализует то, что на уровне Senior применялось точечно: единый файл конвенций для всей организации (какие модели разрешены, что нельзя отправлять в промпт согласно GDPR/CCPA, обязательный human-in-the-loop для определённых категорий изменений), внедрённый как чек-лист в процесс онбординга и как автоматическая проверка в CI.

```markdown
# AI Usage Policy (org-wide)

1. Разрешённые провайдеры: Anthropic (zero data retention), внутренний self-hosted LLM.
2. Запрещено передавать в промпт: PII клиентов, платёжные данные, приватные ключи.
3. Сгенерированный ИИ код для auth/payments — обязательное ревью security-инженером.
4. MCP-серверы публикуются во внутреннем registry с описанием scope доступа.
```

### Проектировать и внедрять интеграцию ИИ в бизнес-продукты

Это верхнеуровневое обобщение всех предыдущих навыков: выбор архитектуры интеграции (прямой API вызов vs SDK vs MCP-агент, см. Middle/Staff разделы ЗНАЕТ), проектирование workflow с точками контроля (см. раздел про ИИ Workflow), закладка требований безопасности и комплаенса на этапе дизайна, а не постфактум, и выбор метрик успеха фичи (снижение времени ответа поддержки, рост конверсии) до начала разработки, чтобы после запуска можно было объективно оценить ценность интеграции для продукта.
