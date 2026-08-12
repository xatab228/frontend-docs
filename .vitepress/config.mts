import { defineConfig } from 'vitepress'

const topics = [
  { slug: 'javascript-basics', title: 'JavaScript — основы' },
  { slug: 'typescript', title: 'TypeScript' },
  { slug: 'vue', title: 'Vue' },
  { slug: 'browser-js-api', title: 'Браузерные JS и API' },
  { slug: 'html-css', title: 'Вёрстка (HTML, CSS)' },
  { slug: 'architecture', title: 'Архитектура Web-приложений' },
  { slug: 'build-and-code-org', title: 'Сборка и организация кода' },
  { slug: 'tools', title: 'Инструменты' },
]

const levels = [
  { slug: 'junior', title: 'Junior' },
  { slug: 'middle', title: 'Middle' },
  { slug: 'senior', title: 'Senior' },
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
        text: 'Темы',
        items: topics.map((t) => ({ text: t.title, link: `/source/${t.slug}/junior` })),
      },
      {
        text: 'Общее',
        items: [
          { text: 'Общие компетенции', link: '/source/general/general-competencies' },
          { text: 'Матрица компетенций (Vue track)', link: '/source/general/grade-requirements-full' },
        ],
      },
    ],

    sidebar: {
      ...Object.fromEntries(
        topics.map((t) => [
          `/source/${t.slug}/`,
          [
            {
              text: t.title,
              items: levels.map((l) => ({
                text: l.title,
                link: `/source/${t.slug}/${l.slug}`,
              })),
            },
            {
              text: 'Другие темы',
              collapsed: true,
              items: topics
                .filter((other) => other.slug !== t.slug)
                .map((other) => ({ text: other.title, link: `/source/${other.slug}/junior` })),
            },
          ],
        ]),
      ),
      '/source/general/': [
        {
          text: 'Общее',
          items: [
            { text: 'Общие компетенции', link: '/source/general/general-competencies' },
            { text: 'Матрица компетенций (Vue track)', link: '/source/general/grade-requirements-full' },
          ],
        },
        {
          text: 'Темы по вопросам',
          collapsed: true,
          items: topics.map((t) => ({ text: t.title, link: `/source/${t.slug}/junior` })),
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
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
