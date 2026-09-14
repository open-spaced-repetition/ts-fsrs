import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import type { RspressPlugin } from '@rspress/core'
import type { FeedOutputTransformer } from '@rspress/plugin-rss'
import { visit } from 'unist-util-visit'
import { z } from 'zod'

export const repository = 'open-spaced-repetition/ts-fsrs'
export const releaseSchema = z.object({
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.iso.datetime({ offset: true }).nullable(),
})
export type Release = z.infer<typeof releaseSchema>

const packages = [
  { directory: 'fsrs', name: 'ts-fsrs', tag: 'v' },
  {
    directory: 'binding',
    name: '@open-spaced-repetition/binding',
    tag: '@open-spaced-repetition/binding@',
  },
  {
    directory: 'srs-kit',
    name: '@open-spaced-repetition/srs-kit',
    tag: '@open-spaced-repetition/srs-kit@',
  },
] as const

export function publishedUpdates(
  releases: readonly Release[],
  changelogs: Readonly<Record<string, string>>
) {
  const published = new Map(
    releases
      .filter(
        (release) =>
          !release.draft && !release.prerelease && release.published_at
      )
      .map((release) => [release.tag_name, release])
  )
  return packages
    .flatMap((pkg) => {
      const markdown = changelogs[pkg.directory]
      // Match version headings only; lower-level headings belong to the entry.
      const sections = [
        ...markdown.matchAll(
          /^## (\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)\s*$/gm
        ),
      ]
      return sections.flatMap((section, index) => {
        const version = section[1]
        if (version.split('+')[0].includes('-')) return []
        const release = published.get(`${pkg.tag}${version}`)
        if (!release?.published_at) return []
        const body = markdown
          .slice(
            section.index + section[0].length,
            sections[index + 1]?.index ?? markdown.length
          )
          .trim()
        return [
          {
            title: `${pkg.name} ${version}`,
            slug: `${pkg.directory}/${version}`,
            version,
            npmUrl: `https://npmx.dev/package/${pkg.name}/v/${version}`,
            publishedAt: release.published_at,
            url: `https://github.com/${repository}/releases/tag/${encodeURIComponent(release.tag_name)}`,
            body,
          },
        ]
      })
    })
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
        a.slug.localeCompare(b.slug)
    )
}

const releaseBodyFilename = (slug: string) =>
  `body_${slug.replaceAll('/', '_')}.md`

const generatedDirectory = (workspaceRoot: string) =>
  path.join(workspaceRoot, 'docs/.generated/releases')

export function updatePages(
  updates: ReturnType<typeof publishedUpdates>,
  base: string
) {
  const description =
    'Published package releases, changelogs, and npm downloads.'
  const template = readFileSync(
    new URL('./template.mdx', import.meta.url),
    'utf8'
  )
  const renderPage = (
    title: string,
    metadata: Record<string, string | boolean>,
    content: string
  ) => {
    const values = {
      title: JSON.stringify(title),
      description: JSON.stringify(description),
      heading: title,
      metadata: Object.entries(metadata)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n'),
      content,
    }
    return template.replace(
      /\{\{(title|description|heading|metadata|content)\}\}/g,
      (_, key: keyof typeof values) => values[key]
    )
  }
  const packageRoute = (directory: string) =>
    directory === 'fsrs' ? '/updates/' : `/updates/${directory}/`
  const releaseLinks = (update: (typeof updates)[number]) =>
    `[npmx](${update.npmUrl}) · [GitHub Release](${update.url})`
  const pages = updates.map((update) => ({
    routePath: `/updates/${update.slug}`,
    extension: 'md' as const,
    content: renderPage(
      update.title,
      { published_at: update.publishedAt },
      `Published: ${update.publishedAt.replace('T', ' ').replace('Z', ' UTC')}\n\n` +
        `<div class="release-update-links">\n\n${releaseLinks(update)}\n\n</div>\n\n[All updates](${packageRoute(update.slug.split('/')[0])})\n\n${update.body}\n`
    ),
  }))
  const pageSize = 10
  const indexes = packages.flatMap((pkg) => {
    const packageUpdates = updates.filter((update) =>
      update.slug.startsWith(`${pkg.directory}/`)
    )
    const pageCount = Math.max(1, Math.ceil(packageUpdates.length / pageSize))
    const routeFor = (page: number) =>
      page === 1
        ? packageRoute(pkg.directory)
        : `${packageRoute(pkg.directory)}page/${page}`
    const tabs = `<nav className="release-updates-tabs" aria-label="Packages">${packages.map((item) => `<a href="${base.replace(/\/$/, '')}${packageRoute(item.directory)}"${item.directory === pkg.directory ? ' aria-current="page"' : ''}>${item.directory === 'fsrs' ? 'ts-fsrs' : item.directory}</a>`).join('')}</nav>`
    return Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1
      const entries = packageUpdates.slice(index * pageSize, page * pageSize)
      const imports = [
        "import ReleaseEntry from '@/releases/ReleaseEntry'",
        ...entries.map(
          (update, index) =>
            `import ReleaseBody${index} from './${releaseBodyFilename(update.slug)}'`
        ),
      ].join('\n')
      const releases = entries.length
        ? entries
            .map((update, index) => {
              const { body: _body, ...metadata } = update
              return `<ReleaseEntry update={${JSON.stringify(metadata)}}><ReleaseBody${index} /></ReleaseEntry>`
            })
            .join('\n\n')
        : 'No published releases match this checkout yet.'
      const navigation = [
        page > 1 ? `[← Newer](${routeFor(page - 1)})` : '',
        `Page ${page} of ${pageCount}`,
        page < pageCount ? `[Older →](${routeFor(page + 1)})` : '',
      ]
        .filter(Boolean)
        .join(' · ')
      return {
        routePath: routeFor(page),
        extension: 'mdx' as const,
        content: renderPage(
          'Updates',
          {
            id: `updates-index-${pkg.directory}-${page}`,
            published_at: '1970-01-01T00:00:00Z',
            outline: false,
            pageType: 'doc-wide',
          },
          `${imports}\n\n${description}\n\n${tabs}\n\n${releases}\n\n${pageCount > 1 ? navigation : ''}\n`
        ),
      }
    })
  })
  return [...indexes, ...pages]
}

// Including the index lets the RSS plugin create even an empty subscription.
// Remove it before serialisation: only actual dated articles are feed entries.
export const releaseFeedOutput: FeedOutputTransformer = (
  _content,
  { feed }
) => {
  feed.items = feed.items.filter(
    (item) => !item.id?.startsWith('updates-index-')
  )
  return feed.atom1()
}

export function prepareReleases(
  workspaceRoot: string,
  base = '/',
  onProgress?: (completed: number, total: number) => void
) {
  const snapshot = path.join(workspaceRoot, 'docs/.generated/releases.json')
  if (!existsSync(snapshot)) {
    throw new Error(
      'Release data is missing. Run pnpm --dir docs prepare:releases first.'
    )
  }
  const releases: Release[] = JSON.parse(readFileSync(snapshot, 'utf8'))
  const changelogs = Object.fromEntries(
    packages.map((pkg) => [
      pkg.directory,
      readFileSync(
        path.join(workspaceRoot, 'packages', pkg.directory, 'CHANGELOG.md'),
        'utf8'
      ),
    ])
  )
  const updates = publishedUpdates(releases, changelogs)
  const pages = updatePages(updates, base)
  const generated = generatedDirectory(workspaceRoot)
  const total = updates.length + pages.length + 1
  let completed = 0
  onProgress?.(completed, total)

  // Only replace the previous output after the snapshot, changelogs, and template are read successfully.
  rmSync(generated, { recursive: true, force: true })
  mkdirSync(generated, { recursive: true })
  // Changelog bodies stay Markdown: literal braces and s<0.5 are not JSX.
  for (const update of updates) {
    writeFileSync(
      path.join(generated, releaseBodyFilename(update.slug)),
      update.body
    )
    onProgress?.(++completed, total)
  }
  const routes = pages.map((page) => {
    const filename = `${page.routePath.replaceAll('/', '_')}.${page.extension}`
    writeFileSync(path.join(generated, filename), page.content)
    onProgress?.(++completed, total)
    return { routePath: page.routePath, filename }
  })
  writeFileSync(
    path.join(generated, 'pages.json'),
    JSON.stringify({ base, routes }, null, 2)
  )
  onProgress?.(++completed, total)
  return routes.length
}

// Each imported body is compiled separately, so repeated headings need a
// release-specific prefix when several bodies appear on the same index page.
export function releaseBodyAnchors() {
  return (tree: Parameters<typeof visit>[0], file: { path?: string }) => {
    if (!file.path || path.basename(path.dirname(file.path)) !== 'releases') {
      return
    }
    const filename = path.basename(file.path, '.md')
    if (!filename.startsWith('body_')) return
    const prefix = `${filename.slice(5)}-`
    visit(tree, (node) => {
      if (node.type !== 'element' || !('properties' in node)) return
      const properties = node.properties as Record<string, unknown>
      if (typeof properties.id === 'string') {
        properties.id = prefix + properties.id
      }
      if (
        typeof properties.href === 'string' &&
        properties.href.startsWith('#')
      ) {
        properties.href = `#${prefix}${properties.href.slice(1)}`
      }
    })
  }
}

export function pluginReleaseUpdates(workspaceRoot: string): RspressPlugin {
  return {
    name: 'release-updates',
    markdown: { rehypePlugins: [releaseBodyAnchors] },
    extendPageData(page) {
      if (!page.routePath.startsWith('/updates/')) return
      const directory = page.routePath.match(
        /\/updates\/(fsrs|binding|srs-kit)\//
      )?.[1]
      page._relativePath = directory
        ? `../../packages/${directory}/CHANGELOG.md`
        : 'releases/index.ts'
    },
    addPages(config) {
      const generated = generatedDirectory(workspaceRoot)
      const manifest = path.join(generated, 'pages.json')
      if (!existsSync(manifest)) {
        throw new Error(
          'Release pages are missing. Run pnpm --dir docs prepare:releases first.'
        )
      }
      const {
        base,
        routes,
      }: {
        base: string
        routes: { routePath: string; filename: string }[]
      } = JSON.parse(readFileSync(manifest, 'utf8'))
      if (base !== (config.base ?? '/')) {
        throw new Error(
          'Release pages use a different DOCS_BASE. Rerun pnpm --dir docs prepare:releases with the current DOCS_BASE.'
        )
      }
      return routes.map(({ routePath, filename }) => ({
        routePath,
        filepath: path.join(generated, filename),
      }))
    },
  }
}
