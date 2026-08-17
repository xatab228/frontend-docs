# Безопасность — Senior

### Продвинутые механизмы аутентификации и авторизации (OIDC, OAuth 2.0)

OpenID Connect (OIDC) — надстройка над OAuth 2.0, добавляющая полноценную аутентификацию: если OAuth 2.0 сам по себе решает только авторизацию (выдачу access token для доступа к ресурсу), то OIDC вводит стандартизированный `id_token` (JWT с данными о личности пользователя — sub, email, name) и эндпоинт `/userinfo`. Ключевые флоу OAuth 2.0: Authorization Code Flow (самый безопасный, код обменивается на токен на сервере), Authorization Code Flow with PKCE (обязателен для SPA и мобильных приложений — защищает от перехвата authorization code, так как требует code_verifier, известный только исходному клиенту), Client Credentials Flow (для межсервисного взаимодействия без пользователя) и устаревший Implicit Flow (токен возвращается прямо в URL-фрагменте, больше не рекомендуется из-за рисков утечки через историю браузера и логи).

```
PKCE Flow (SPA):
1. Клиент генерирует code_verifier (случайная строка) и code_challenge = SHA256(code_verifier)
2. Редирект на /authorize?...&code_challenge=...&code_challenge_method=S256
3. IdP возвращает authorization code
4. Клиент обменивает code + code_verifier на access_token и id_token на /token
5. IdP проверяет, что SHA256(code_verifier) == code_challenge, сохранённый на шаге 2
```

```js
// Проверка id_token на клиенте (для отображения, не для авторизации бэкенд-запросов!)
function parseIdToken(idToken) {
  const [, payload] = idToken.split('.');
  const claims = JSON.parse(atob(payload));
  return claims; // { sub, email, name, exp, iss, aud }
}
```

На практике проектирование SPA-аутентификации строится через Authorization Code Flow с PKCE (см. выше) с учётом безопасного хранения токенов: access token — в памяти (переменная состояния приложения, не `localStorage`, чтобы уменьшить поверхность атаки для XSS), refresh token — в `httpOnly; Secure; SameSite=Strict` cookie, недоступной для JavaScript.

```js
// Хранение access token в памяти + автоматическое обновление через httpOnly refresh cookie
let accessToken = null;

async function refreshAccessToken() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include', // отправляет httpOnly refresh-cookie автоматически
  });
  const data = await res.json();
  accessToken = data.access_token; // новый короткоживущий access token — только в памяти
  return accessToken;
}
```

Проектирование RBAC/ABAC-модели на бэкенде с проверкой прав middleware'ом на каждый защищённый эндпоинт — фронтенд лишь отражает эти права в UI (см. пример `ProtectedRoute` в middle.md), но не является источником истины для авторизации.

### Риски безопасности, указанные в OWASP Top 10 (SQL инъекция, XSS, CSRF)

SQL-инъекция — внедрение вредоносного SQL-кода через непроверенный пользовательский ввод, позволяющее читать/изменять/удалять данные в обход бизнес-логики; защита — параметризованные запросы и ORM, никогда не строить запросы конкатенацией строк. XSS (Cross-Site Scripting) — внедрение исполняемого JavaScript в страницу, которую видят другие пользователи; бывает Stored (скрипт сохранён на сервере, например в комментарии), Reflected (скрипт приходит в ответе на конкретный запрос, часто через query-параметр) и DOM-based (уязвимость целиком в клиентском коде, без участия сервера — например, `location.hash` вставляется в `innerHTML`). CSRF (Cross-Site Request Forgery) — атака, при которой злоумышленник заставляет браузер жертвы отправить запрос к другому сайту, используя уже существующие у жертвы cookie-сессии (например, скрытая форма, автоматически отправляющая POST-запрос на банковский сайт); защита — CSRF-токены, проверка заголовка `Origin`/`Referer` и атрибут cookie `SameSite`.

```js
// DOM-based XSS: уязвимость целиком на клиенте
const params = new URLSearchParams(location.search);
document.getElementById('greeting').innerHTML = `Привет, ${params.get('name')}`;
// URL: ?name=<img src=x onerror=alert(document.cookie)> — выполнится в браузере жертвы

// Защита от CSRF: cookie с SameSite не отправляется при межсайтовых запросах
// Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
```

Оценка риска обычно строится по формуле «вероятность эксплуатации × потенциальный ущерб», как это делает OWASP Risk Rating Methodology. Например, для найденной DOM-based XSS уязвимости (см. пример выше): вероятность эксплуатации высокая (параметр URL легко подделать и распространить ссылку), ущерб высокий (кража сессионных cookie, полный захват аккаунта жертвы) — итоговый риск критический, требует немедленного фикса, а не постановки в бэклог. Такой анализ оформляется в виде матрицы (severity × likelihood) и используется для приоритизации задач security-бэклога наравне с обычными фичами.

### Методы контроля безопасности (Access control lists, RBAC, ABAC)

Access Control List (ACL) — список конкретных субъектов (пользователей/групп) с явно указанными разрешёнными операциями над конкретным ресурсом — гибко, но плохо масштабируется при большом числе пользователей и ресурсов. RBAC (Role-Based Access Control) — права назначаются ролям, а не пользователям напрямую (см. middle.md), что проще администрировать, но негибко для точечных исключений. ABAC (Attribute-Based Access Control) — решение о доступе принимается динамически на основе атрибутов субъекта, ресурса, действия и контекста (например: «редактор может публиковать статью, только если статья принадлежит его отделу и сейчас рабочее время») — максимально гибко, но сложнее реализовать и протестировать. Выбор зависит от сложности требований: RBAC достаточно для большинства приложений, ABAC оправдан при сложных контекстных правилах доступа (финтех, healthcare).

```js
// Пример ABAC-правила
function canEditArticle(user, article, context) {
  return (
    article.departmentId === user.departmentId &&
    (user.role === 'editor' || article.authorId === user.id) &&
    context.currentTime.getHours() >= 9 && context.currentTime.getHours() < 18
  );
}
```

### Основы работы систем контроля безопасности, таких как Sonar, SAST и DAST

SAST (Static Application Security Testing) — анализ исходного кода без его выполнения, ищет уязвимые паттерны (SQL-конкатенация, использование `eval`, устаревшие зависимости с известными CVE) на этапе сборки/CI, до деплоя; инструменты — SonarQube, ESLint security-плагины, Semgrep. DAST (Dynamic Application Security Testing) — анализ уже запущенного приложения через реальные HTTP-запросы, имитирующие атаки (внедрение XSS-пейлоадов, перебор параметров), находит уязвимости, невидимые в статическом коде (ошибки конфигурации сервера, реальное поведение runtime); инструменты — OWASP ZAP, Burp Suite. Для фронтенд-команды SAST обычно встраивается в pre-commit хуки и CI pipeline, а DAST запускается на staging-окружении перед релизом.

```yaml
# .github/workflows/security.yml — пример SAST в CI
- name: Run ESLint security rules
  run: npx eslint --plugin security --ext .js,.ts src/
- name: SonarQube scan
  uses: sonarsource/sonarqube-scan-action@v2
```

На практике это дополняется настройкой `npm audit`/Snyk в CI для обнаружения известных уязвимостей в зависимостях и ESLint security-плагина для статического анализа кода на уязвимые паттерны:

```bash
npm audit --audit-level=high    # прервёт CI при уязвимостях high/critical
npx eslint --ext .ts,.tsx src/  # с eslint-plugin-security подключённым в .eslintrc
```

```js
// .eslintrc.js — фрагмент конфигурации
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended-legacy'],
  rules: {
    'security/detect-object-injection': 'warn',
    'security/detect-eval-with-expression': 'error',
  },
};
```

### Расширенные возможности Secure Hash Algorithms (SHA-256, SHA-512)

SHA-256 и SHA-512 — представители семейства SHA-2, отличающиеся длиной выходного хеша (256 и 512 бит соответственно) и внутренним размером слова обработки (32 бита у SHA-256, 64 бита у SHA-512), что делает SHA-512 быстрее на 64-битных платформах при работе с большими объёмами данных, несмотря на больший размер хеша. Оба считаются криптографически стойкими на сегодняшний день (в отличие от устаревших MD5 и SHA-1, для которых найдены коллизии), применяются в TLS-сертификатах, git-объектах, blockchain, JWT-подписях (алгоритм `HS256`/`RS256` в заголовке токена как раз указывает на используемый вариант SHA в связке с HMAC или RSA). Для проверки целостности файлов на практике часто выбирают SHA-256 как баланс между скоростью и достаточной стойкостью против коллизий.

```js
async function sha512(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

### Cross-Origin Resource Sharing (CORS) и его назначение

CORS — механизм браузера, ослабляющий Same-Origin Policy (по умолчанию скрипт с одного origin не может читать ответы от другого origin) контролируемым образом: сервер явно указывает через заголовки, каким origin-ам, с какими методами и заголовками разрешено обращаться к нему из браузера. Для «простых» запросов (GET/POST с базовыми заголовками) браузер сразу выполняет запрос и проверяет заголовок ответа `Access-Control-Allow-Origin`; для «непростых» запросов (кастомные заголовки, методы PUT/DELETE, `Content-Type: application/json`) браузер сначала отправляет preflight-запрос методом `OPTIONS`, и только при разрешающем ответе выполняет реальный запрос. Важно понимать, что CORS — защита не сервера от клиента, а пользователя от того, чтобы вредоносный сайт от его имени читал ответы чужого API через его же браузерную сессию; сам по себе CORS не защищает API — доступ к API напрямую (не из браузера, curl/Postman) CORS не ограничивает.

```
# Preflight-запрос браузера
OPTIONS /api/orders HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Content-Type

# Ответ сервера
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

Настройка CORS на стороне Node.js/Express-бэкенда, обслуживающего фронтенд-приложение, с ограничением до конкретных origin-ов вместо `*`, что обязательно при использовании cookie-based авторизации:

```js
const cors = require('cors');

app.use(cors({
  origin: ['https://app.example.com', 'https://staging.example.com'],
  credentials: true, // разрешает отправку cookie в кросс-доменных запросах
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
```

Важный нюанс: `Access-Control-Allow-Origin: *` несовместим с `credentials: true` — при использовании cookie-сессий сервер обязан отражать конкретный разрешённый origin, а не wildcard, иначе браузер отклонит ответ.
