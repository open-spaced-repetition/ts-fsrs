import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { defineConfig } from '@rspress/core'
import { pluginRss } from '@rspress/plugin-rss'
import { pluginTwoslash } from '@rspress/plugin-twoslash'
import { adaptI18nSource } from './src/i18n'
import { collectPlaygroundDeclarations } from './src/playground/editor/collect-declarations'
import {
  collectHighlightedExportNames,
  keepTsFsrsTypeHover,
} from './src/playground/highlight/twoslash'

const siteOrigin = process.env.DOCS_SITE_ORIGIN
const repository =
  process.env.DOCS_REPO_SLUG ?? 'open-spaced-repetition/ts-fsrs'
const repositoryRef = (process.env.DOCS_REPO_REF ?? 'main')
  .split('/')
  .map(encodeURIComponent)
  .join('/')
const workspaceRoot = path.resolve(import.meta.dirname, '..')
const playgroundDeclarations = collectPlaygroundDeclarations(workspaceRoot)
const highlightedExportNames = collectHighlightedExportNames(
  playgroundDeclarations
)
// Any module whose path ends in `.css` is pulled into the site-wide stylesheet,
// so the editor styles are inlined as a string that only the playground's async
// chunk references. Monaco's icon font is a data URI, so no asset rewriting is
// needed. See src/playground/editor/styles-stub.css for the other half.
const monacoEditorStyles = readFileSync(
  createRequire(import.meta.url).resolve(
    'monaco-editor/min/vs/editor/editor.main.css'
  ),
  'utf8'
)

export default defineConfig({
  root: path.join(import.meta.dirname, 'src'),
  route: {
    extensions: ['.md', '.mdx'],
    localeRedirect: 'never',
  },
  themeDir: path.join(import.meta.dirname, 'theme'),
  title: 'ts-fsrs',
  description: 'Developer documentation for ts-fsrs',
  lang: 'en-US',
  locales: [
    {
      lang: 'en-US',
      label: 'English',
      title: 'ts-fsrs',
      description: 'Developer documentation for ts-fsrs',
    },
    {
      lang: 'zh-CN',
      label: '简体中文',
      title: 'ts-fsrs',
      description: 'ts-fsrs 开发者文档',
    },
    {
      lang: 'ja-JP',
      label: '日本語',
      title: 'ts-fsrs',
      description: 'ts-fsrs 開発者向けドキュメント',
    },
  ],
  i18nSource: adaptI18nSource,
  siteOrigin,
  llms: true,
  builderConfig: {
    plugins: [pluginTailwindcss()],
    dev: {
      // The message catalogs are read by this config file, not by the route
      // sources, so Rspress would otherwise serve the catalog captured when the
      // dev server started and `useI18n` would throw on every key added since.
      watchFiles: {
        paths: [path.join(import.meta.dirname, 'src/i18n')],
        type: 'reload-server',
      },
    },
    source: {
      define: {
        __MONACO_EDITOR_STYLES__: JSON.stringify(monacoEditorStyles),
        __PLAYGROUND_DTS_FILES__: JSON.stringify(playgroundDeclarations),
      },
    },
    tools: {
      rspack(config, { rspack }) {
        // See src/playground/editor/styles-stub.css for why Monaco's styles are
        // redirected to an empty stylesheet rather than dropped outright.
        config.plugins?.push(
          new rspack.NormalModuleReplacementPlugin(
            /[\\/]monaco-editor[\\/]esm[\\/].+\.css$/,
            path.join(
              import.meta.dirname,
              'src/playground/editor/styles-stub.css'
            )
          )
        )
      },
    },
  },
  plugins: [
    pluginTwoslash({
      twoslashOptions: {
        filterNode: (node) => keepTsFsrsTypeHover(node, highlightedExportNames),
      },
    }),
    pluginRss({
      feed: [
        {
          id: 'updates',
          test: /^\/updates\//,
          title: 'ts-fsrs updates',
          language: 'en-US',
        },
        {
          id: 'updates-zh',
          test: /^\/zh-CN\/updates\//,
          title: 'ts-fsrs 更新',
          language: 'zh-CN',
        },
        {
          id: 'updates-ja',
          test: /^\/ja-JP\/updates\//,
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
