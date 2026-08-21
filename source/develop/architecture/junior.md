# Архитектура — Junior

## Аспекты монолитной архитектуры и клиент-серверного подхода, понятие модульности

Монолитная архитектура — приложение разрабатывается, собирается и разворачивается как единое целое: все модули (UI, бизнес-логика, доступ к данным) живут в одном кодовом репозитории и одном процессе выполнения. Плюсы монолита — простота разработки, отладки и деплоя на старте проекта, отсутствие сетевых накладных расходов между модулями. Клиент-серверная модель разделяет систему на клиента (frontend, отправляющий запросы и отображающий данные) и сервер (backend, обрабатывающий бизнес-логику и хранящий данные) — они взаимодействуют по сети через определённый протокол (обычно HTTP). Модульность — принцип разбиения приложения на логически независимые части (модули) с чётко определёнными границами и интерфейсами взаимодействия, что упрощает сопровождение даже внутри монолита.

```text
project/
  src/
    modules/
      cart/      — модуль корзины: свои компоненты, стейт, API-вызовы
      catalog/   — модуль каталога товаров
      auth/      — модуль авторизации
    shared/      — общие утилиты, UI-кит
```

```ts
// клиент-серверное взаимодействие: клиент делает запрос, сервер отвечает данными
const response = await fetch('https://api.example.com/products');
const products = await response.json();
```

Опираясь на модульную структуру выше — простейшее монолитное frontend-приложение можно спроектировать так, чтобы модули внутри одного репозитория не зависели друг от друга напрямую, а общались через `shared`-слой, что облегчает будущее выделение частей в отдельные сервисы:

```text
project/
  src/
    modules/
      cart/
        CartPage.tsx
        cartApi.ts       — обращения к серверу только внутри модуля
      catalog/
        CatalogPage.tsx
        catalogApi.ts
    shared/
      httpClient.ts       — единая точка настройки запросов (базовый URL, заголовки)
    App.tsx                — точка сборки модулей в одно приложение
```

```ts
// shared/httpClient.ts — единая точка входа для клиент-серверного взаимодействия
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`Ошибка запроса: ${res.status}`);
  return res.json();
}
```

## Общая концепция паттернов MVC (Model-View-Controller) и MVVM (Model-View-ViewModel)

MVC разделяет приложение на три части: Model (данные и бизнес-логика), View (отображение данных пользователю) и Controller (обрабатывает пользовательский ввод, обновляет Model и выбирает View для отображения результата). Такое разделение упрощает независимое тестирование и изменение каждой части. MVVM — эволюция MVC для UI-фреймворков с двухсторонним связыванием данных: View связывается с ViewModel через биндинг (изменения в UI автоматически обновляют ViewModel и наоборот), а ViewModel хранит презентационное состояние и обращается к Model, полностью отделяя View от прямой работы с бизнес-логикой.

```ts
// упрощённый MVC на клиенте
class ProductModel {
  constructor(public name: string, public price: number) {}
}

class ProductView {
  render(product: ProductModel): string {
    return `<div>${product.name}: ${product.price}₽</div>`;
  }
}

class ProductController {
  constructor(private model: ProductModel, private view: ProductView) {}
  updatePrice(newPrice: number): string {
    this.model.price = newPrice;
    return this.view.render(this.model);
  }
}
```

```vue
<!-- MVVM: Vue связывает View и ViewModel через v-model -->
<template>
  <input v-model="productName" />
</template>
<script setup>
import { ref } from 'vue';
const productName = ref('Товар'); // ViewModel-состояние, синхронизировано с View
</script>
```

## Методы обработки и логирования ошибок

Обработка ошибок — механизм перехвата исключительных ситуаций (сетевая ошибка, невалидные данные, падение стороннего сервиса) и предотвращения аварийного завершения приложения, обычно через `try/catch`, обработчики промисов (`.catch`) и глобальные обработчики (`window.onerror`, `unhandledrejection` в браузере). Логирование ошибок — фиксация информации об ошибке (сообщение, стектрейс, контекст) в постоянном хранилище или сервисе (например, Sentry), чтобы разработчик мог позже проанализировать проблему, даже если пользователь не сообщил о ней напрямую.

```ts
async function loadUserProfile(userId: string) {
  try {
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Не удалось загрузить профиль пользователя', error);
    throw error;
  }
}

// глобальный перехват необработанных ошибок
window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанный промис:', event.reason);
});
```

## Основные уровни логирования (debug, info, warning, error)

Уровни логирования упорядочивают сообщения по важности, позволяя фильтровать шум в продакшене и видеть детальную картину при отладке. `debug` — подробная техническая информация, полезная только при разработке/отладке (значения переменных, шаги алгоритма), обычно отключена в продакшене. `info` — обычные события нормальной работы приложения (пользователь вошёл в систему, страница загружена). `warning` — ситуация нештатная, но не критичная, приложение продолжает работать (устаревший API, повторная попытка запроса). `error` — сбой, нарушающий нормальную работу функциональности и требующий внимания разработчика.

```ts
const logger = {
  debug: (msg: string, ctx?: unknown) => console.debug(`[DEBUG] ${msg}`, ctx),
  info: (msg: string, ctx?: unknown) => console.info(`[INFO] ${msg}`, ctx),
  warn: (msg: string, ctx?: unknown) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg: string, ctx?: unknown) => console.error(`[ERROR] ${msg}`, ctx),
};

logger.debug('Запрос отправлен', { url: '/api/cart' });
logger.info('Товар добавлен в корзину');
logger.warn('Использован устаревший эндпоинт /api/v1/cart');
logger.error('Не удалось оформить заказ', { orderId: 42 });
```
