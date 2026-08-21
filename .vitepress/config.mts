import { defineConfig } from 'vitepress'

const frontendTopics = [
  { slug: 'javascript-basics', title: 'JavaScript — основы' },
  { slug: 'typescript', title: 'TypeScript' },
  { slug: 'vue', title: 'Vue' },
  { slug: 'browser-js-api', title: 'Браузерные JS и API' },
  { slug: 'html-css', title: 'Вёрстка (HTML, CSS)' },
  { slug: 'architecture', title: 'Архитектура Web-приложений' },
  { slug: 'build-and-code-org', title: 'Сборка и организация кода' },
  { slug: 'tools', title: 'Инструменты' },
]

const developTopics = [
  { slug: 'sdlc', title: 'Жизненный цикл разработки ПО' },
  { slug: 'quality', title: 'Обеспечение качества' },
  { slug: 'ai-tools', title: 'Работа с инструментами ИИ' },
  { slug: 'algorithms', title: 'Структуры данных и алгоритмы' },
  { slug: 'patterns', title: 'Паттерны разработки' },
  { slug: 'architecture', title: 'Архитектура' },
  { slug: 'infra-cloud', title: 'Инфраструктура и Cloud' },
  { slug: 'api-protocols', title: 'Протоколы, API' },
  { slug: 'security', title: 'Безопасность' },
  { slug: 'databases', title: 'Базы данных' },
]

const frontendLevels = [
  { slug: 'junior', title: 'Junior' },
  { slug: 'middle', title: 'Middle' },
  { slug: 'senior', title: 'Senior' },
  { slug: 'staff', title: 'Staff' },
]

const developLevels = [
  { slug: 'junior', title: 'Junior' },
  { slug: 'middle', title: 'Middle' },
  { slug: 'senior', title: 'Senior' },
  { slug: 'staff', title: 'Staff' },
]

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/frontend-docs/',
  lang: 'ru-RU',
  title: "Frontend Docs",
  description: "База знаний по вопросам собеседований и требованиям к грейдам",

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Главная', link: '/' },
      {
        text: 'Frontend',
        items: frontendTopics.map((t) => ({ text: t.title, link: `/source/frontend/${t.slug}/junior` })),
      },
      {
        text: 'Развитие разработчика',
        items: developTopics.map((t) => ({ text: t.title, link: `/source/develop/${t.slug}/junior` })),
      },
      {
        text: 'Общее',
        items: [
          { text: 'Общие компетенции', link: '/source/general/general-competencies' },
          { text: 'Требования к грейдам (Developer)', link: '/source/general/developer-requirements-full' },
          { text: 'Требования к грейдам (Frontend)', link: '/source/general/frontend-requirements-full' },
        ],
      },
    ],

    sidebar: {
      ...Object.fromEntries(
        frontendTopics.map((t) => [
          `/source/frontend/${t.slug}/`,
          [
            {
              text: t.title,
              items: frontendLevels.map((l) => ({
                text: l.title,
                link: `/source/frontend/${t.slug}/${l.slug}`,
              })),
            },
            {
              text: 'Другие темы (Frontend)',
              collapsed: true,
              items: frontendTopics
                .filter((other) => other.slug !== t.slug)
                .map((other) => ({ text: other.title, link: `/source/frontend/${other.slug}/junior` })),
            },
          ],
        ]),
      ),
      ...Object.fromEntries(
        developTopics.map((t) => [
          `/source/develop/${t.slug}/`,
          [
            {
              text: t.title,
              items: developLevels.map((l) => ({
                text: l.title,
                link: `/source/develop/${t.slug}/${l.slug}`,
              })),
            },
            {
              text: 'Другие темы (Развитие)',
              collapsed: true,
              items: developTopics
                .filter((other) => other.slug !== t.slug)
                .map((other) => ({ text: other.title, link: `/source/develop/${other.slug}/junior` })),
            },
          ],
        ]),
      ),
      '/source/general/': [
        {
          text: 'Общее',
          items: [
            { text: 'Общие компетенции', link: '/source/general/general-competencies' },
            { text: 'Требования к грейдам (Developer)', link: '/source/general/developer-requirements-full' },
            { text: 'Требования к грейдам (Frontend)', link: '/source/general/frontend-requirements-full' },
          ],
        },
        {
          text: 'Темы по вопросам (Frontend)',
          collapsed: true,
          items: frontendTopics.map((t) => ({ text: t.title, link: `/source/frontend/${t.slug}/junior` })),
        },
        {
          text: 'Темы по вопросам (Развитие)',
          collapsed: true,
          items: developTopics.map((t) => ({ text: t.title, link: `/source/develop/${t.slug}/junior` })),
        },
      ],
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Поиск',
                buttonAriaLabel: 'Поиск',
              },
              modal: {
                noResultsText: 'Ничего не найдено по запросу',
                resetButtonTitle: 'Сбросить запрос',
                footer: {
                  selectText: 'выбрать',
                  navigateText: 'перейти',
                  closeText: 'закрыть',
                },
              },
            },
          },
        },
      },
    },

    outline: {
      level: [2, 3],
      label: 'На этой странице',
    },

    docFooter: {
      prev: 'Предыдущая страница',
      next: 'Следующая страница',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xatab228/frontend-docs' }
    ]
  }
})
