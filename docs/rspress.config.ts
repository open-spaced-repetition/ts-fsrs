import path from 'node:path'
import { defineConfig } from '@rspress/core'
import { pluginRss } from '@rspress/plugin-rss'

const siteOrigin = process.env.DOCS_SITE_ORIGIN
const repository =
  process.env.DOCS_REPO_SLUG ?? 'open-spaced-repetition/ts-fsrs'
const repositoryRef = (process.env.DOCS_REPO_REF ?? 'main')
  .split('/')
  .map(encodeURIComponent)
  .join('/')

export default defineConfig({
  root: path.join(import.meta.dirname, 'src'),
  title: 'ts-fsrs',
  description: 'Developer documentation for ts-fsrs',
  lang: 'en',
  locales: [
    {
      lang: 'en',
      label: 'English',
      title: 'ts-fsrs',
      description: 'Developer documentation for ts-fsrs',
    },
    {
      lang: 'zh',
      label: '简体中文',
      title: 'ts-fsrs',
      description: 'ts-fsrs 开发者文档',
    },
    {
      lang: 'ja',
      label: '日本語',
      title: 'ts-fsrs',
      description: 'ts-fsrs 開発者向けドキュメント',
    },
  ],
  siteOrigin,
  llms: true,
  plugins: [
    pluginRss({
      feed: [
        {
          id: 'updates',
          test: /^\/updates\//,
          title: 'ts-fsrs updates',
          language: 'en',
        },
        {
          id: 'updates-zh',
          test: /^\/zh\/updates\//,
          title: 'ts-fsrs 更新',
          language: 'zh-CN',
        },
        {
          id: 'updates-ja',
          test: /^\/ja\/updates\//,
          title: 'ts-fsrs 更新情報',
          language: 'ja-JP',
        },
      ],
    }),
  ],
  search: {
    searchHooks: path.join(import.meta.dirname, 'search.ts'),
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'github-stars',
        content: 'https://github.com/open-spaced-repetition/ts-fsrs',
      },
    ],
    editLink: {
      docRepoBaseUrl: `https://github.com/${repository}/tree/${repositoryRef}/docs/src`,
    },
  },
})
