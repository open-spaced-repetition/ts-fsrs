import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { defineConfig } from '@rspress/core'
import { pluginRss } from '@rspress/plugin-rss'
import { pluginTwoslash } from '@rspress/plugin-twoslash'
import { adaptI18nSource } from './src/i18n'
import {
  readLandingContributors,
  readLandingSponsors,
} from './src/landing/community'
import { collectLandingPreviews } from './src/landing/preview'
import { collectLandingSnippets } from './src/landing/snippets'
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

// Rspress ships a fixed set of named social icons and RSS is not among them,
// so the navbar entry supplies its own inline SVG.
const rssIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93z"/></svg>`

const twoslashOptions = {
  filterNode: (node: Parameters<typeof keepTsFsrsTypeHover>[0]) =>
    keepTsFsrsTypeHover(node, highlightedExportNames),
}
const landingSnippets = await collectLandingSnippets(
  import.meta.dirname,
  twoslashOptions
)
const landingPreviews = collectLandingPreviews()
const landingSponsors = readLandingSponsors(import.meta.dirname)
const landingContributors = readLandingContributors(import.meta.dirname)

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
      // Only files this config reads at evaluation time belong here, because a
      // restart is the sole way to pick them up: otherwise the dev server keeps
      // serving whatever was captured at startup, so `useI18n` throws on every
      // key added since and edited landing snippets never reach the home page.
      // `src/snippets/run-code` deliberately stays out — the guide imports it
      // with `?raw`, which puts it in the module graph, and widening this to
      // `src/snippets` would trade that HMR update for a full restart.
      watchFiles: {
        paths: [
          path.join(import.meta.dirname, 'src/i18n'),
          path.join(import.meta.dirname, 'src/snippets/landing'),
        ],
        type: 'reload-server',
      },
    },
    source: {
      define: {
        __MONACO_EDITOR_STYLES__: JSON.stringify(monacoEditorStyles),
        __PLAYGROUND_DTS_FILES__: JSON.stringify(playgroundDeclarations),
        __LANDING_SNIPPETS__: JSON.stringify(landingSnippets),
        __LANDING_PREVIEWS__: JSON.stringify(landingPreviews),
        __LANDING_SPONSORS__: JSON.stringify(landingSponsors),
        __LANDING_CONTRIBUTORS__: JSON.stringify(landingContributors),
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
    pluginTwoslash({ twoslashOptions }),
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
  icon: '/osr-logo.svg',
  logo: '/osr-logo.svg',
  logoText: 'ts-fsrs',
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'github-stars',
        content: 'https://github.com/open-spaced-repetition/ts-fsrs',
      },
      {
        // `socialLinks` is site-wide, so this points at the page that lists the
        // per-locale feeds rather than at one locale's `.xml`.
        icon: { svg: rssIcon },
        mode: 'link',
        content: '/guide/llms',
      },
    ],
    editLink: {
      docRepoBaseUrl: `https://github.com/${repository}/tree/${repositoryRef}/docs/src`,
    },
  },
})
