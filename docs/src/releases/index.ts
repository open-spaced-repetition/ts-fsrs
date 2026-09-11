import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { RspressPlugin } from '@rspress/core'
import type { FeedOutputTransformer } from '@rspress/plugin-rss'
import { z } from 'zod'

const repository = 'open-spaced-repetition/ts-fsrs'
const releaseSchema = z.object({
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.iso.datetime({ offset: true }).nullable(),
})
export type Release = z.infer<typeof releaseSchema>

export async function fetchReleases(
  token: string | undefined,
  request: typeof fetch = fetch
): Promise<Release[]> {
  const releases: Release[] = []
  for (let page = 1; ; page++) {
    const response = await request(
      `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(30_000),
      }
    )
    if (!response.ok) {
      throw new Error(`Release lookup failed: GitHub HTTP ${response.status}`)
    }
    const batch = z.array(releaseSchema).parse(await response.json())
    releases.push(...batch)
    if (batch.length < 100) return releases
  }
}

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

export function updatePages(
  updates: ReturnType<typeof publishedUpdates>,
  base: string
) {
  const description =
    'Published package releases, changes, and links to GitHub release notes.'
  const frontmatter = (title: string, extra = '') => `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
sidebar: false
prev: false
next: false
${extra}---\n\n# ${title}\n\n`
  const subscribe = `<a href="${base.replace(/\/$/, '')}/rss/updates.xml">Subscribe via Atom</a>`
  const pages = updates.map((update) => ({
    routePath: `/updates/${update.slug}`,
    content:
      frontmatter(
        update.title,
        `published_at: ${JSON.stringify(update.publishedAt)}\n`
      ) +
      `Published: ${update.publishedAt.replace('T', ' ').replace('Z', ' UTC')}\n\n` +
      `[GitHub Release](${update.url}) · [All updates](/updates/) · ${subscribe}\n\n${update.body}\n`,
  }))
  const pageSize = 10
  const packageRoute = (directory: string) =>
    directory === 'fsrs' ? '/updates/' : `/updates/${directory}/`
  const indexes = packages.flatMap((pkg) => {
    const packageUpdates = updates.filter((update) =>
      update.slug.startsWith(`${pkg.directory}/`)
    )
    const pageCount = Math.max(1, Math.ceil(packageUpdates.length / pageSize))
    const routeFor = (page: number) =>
      page === 1
        ? packageRoute(pkg.directory)
        : `${packageRoute(pkg.directory)}page/${page}`
    const tabs = `<nav class="release-updates-tabs" aria-label="Packages">${packages.map((item) => `<a href="${base.replace(/\/$/, '')}${packageRoute(item.directory)}"${item.directory === pkg.directory ? ' aria-current="page"' : ''}>${item.directory === 'binding' ? item.name : item.directory === 'fsrs' ? 'ts-fsrs' : 'srs-kit'}</a>`).join('')}</nav>`
    return Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1
      const entries = packageUpdates.slice(index * pageSize, page * pageSize)
      const table = entries.length
        ? `<table class="release-updates-table">
<thead><tr><th scope="col">Version</th><th scope="col">Published (UTC)</th><th scope="col">Changes</th></tr></thead>
<tbody>
${entries
  .map(
    (update) => `<tr><td>

[${update.slug.split('/')[1]}](/updates/${update.slug})

</td><td>${update.publishedAt.slice(0, 10)}</td><td>

${update.body}

</td></tr>`
  )
  .join('\n')}
</tbody></table>`
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
        content: `${frontmatter('Updates', `id: updates-index-${pkg.directory}-${page}\npublished_at: "1970-01-01T00:00:00Z"\noutline: false\npageType: doc-wide\n`)}${description}\n\n${subscribe}\n\n${tabs}\n\n${navigation}\n\n${table}\n\n${navigation}\n`,
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

export function pluginReleaseUpdates(workspaceRoot: string): RspressPlugin {
  return {
    name: 'release-updates',
    extendPageData(page) {
      if (!page.routePath.startsWith('/updates/')) return
      const directory = page.routePath.match(
        /\/updates\/(fsrs|binding|srs-kit)\//
      )?.[1]
      page._relativePath = directory
        ? `../../packages/${directory}/CHANGELOG.md`
        : 'releases/index.ts'
    },
    async addPages(config, isProd) {
      const releases = await fetchReleases(process.env.GITHUB_TOKEN)
      const changelogs = Object.fromEntries(
        packages.map((pkg) => [
          pkg.directory,
          readFileSync(
            path.join(workspaceRoot, 'packages', pkg.directory, 'CHANGELOG.md'),
            'utf8'
          ),
        ])
      )
      const generated = path.join(
        workspaceRoot,
        'docs/node_modules/.cache/release-updates',
        isProd ? 'build' : 'dev'
      )
      mkdirSync(generated, { recursive: true })
      // AdditionalPage.content becomes MDX. Changelogs are plain Markdown and
      // can contain text such as `s<0.5` or braces that must not execute as JSX.
      return updatePages(
        publishedUpdates(releases, changelogs),
        config.base ?? '/'
      ).map((page) => {
        const filepath = path.join(
          generated,
          `${page.routePath.replaceAll('/', '_')}.md`
        )
        writeFileSync(filepath, page.content)
        return { routePath: page.routePath, filepath }
      })
    },
  }
}
