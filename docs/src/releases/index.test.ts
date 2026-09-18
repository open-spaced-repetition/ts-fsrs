import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fetchReleases } from '../../scripts/fetch-releases'
import {
  filterReleaseDetailsFromLlms,
  pluginReleaseUpdates,
  prepareReleases,
  publishedUpdates,
  type Release,
  releaseBodyAnchors,
  releaseFeedOutput,
  updatePages,
} from './index'

const release = (tag: string, extra: Partial<Release> = {}): Release => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  published_at: '2026-09-11T07:30:00Z',
  ...extra,
})

const changelogs = {
  fsrs: '# ts-fsrs\n\n## 6.0.0\n\n### Minor Changes\n\nUnpublished\n\n## 5.4.2\n\n### Patch Changes\n\nFixed a bug.\n',
  binding: '## 0.6.0-beta.1\n\nBeta update.\n\n## 0.5.0\n\nWASM update.\n',
  'srs-kit': '## 0.1.0\n\nInternal package.\n',
}

describe('published release updates', () => {
  it('shortens raw repository PR URLs in lists and details while preserving link targets and custom labels', () => {
    const url = 'https://github.com/open-spaced-repetition/ts-fsrs/pull/211'
    for (const filename of ['body_fsrs_5.4.2.md', '_updates_fsrs_5.4.2.md']) {
      const tree = {
        type: 'root',
        children: [
          {
            type: 'element',
            properties: { href: url },
            children: [{ type: 'text', value: url }],
          },
          {
            type: 'element',
            properties: { href: url },
            children: [{ type: 'text', value: 'Custom label' }],
          },
        ],
      }
      releaseBodyAnchors()(tree, {
        path: `/docs/.generated/releases/${filename}`,
      })
      expect(tree.children[0].children[0].value).toBe('#PR211')
      expect(tree.children[0].properties.href).toBe(url)
      expect(tree.children[1].children[0].value).toBe('Custom label')
    }
  })

  it('namespaces imported body anchors without changing ordinary document anchors', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', properties: { id: 'patch-changes' } },
        { type: 'element', properties: { href: '#patch-changes' } },
      ],
    }
    releaseBodyAnchors()(tree, { path: '/docs/src/guide/index.md' })
    expect(tree.children[0].properties.id).toBe('patch-changes')
    releaseBodyAnchors()(tree, {
      path: '/docs/.generated/releases/body_fsrs_5.4.2.md',
    })
    expect(tree.children[0].properties.id).toBe('fsrs_5.4.2-patch-changes')
    expect(tree.children[1].properties.href).toBe('#fsrs_5.4.2-patch-changes')
  })

  it('prepares pages once, preserves Markdown, and registers them without rewriting files', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ts-fsrs-releases-'))
    const generated = path.join(root, 'docs/.generated/releases')
    const body =
      '### Patch Changes\n\ns<0.5 and {literal} and {{heading}}\n\n```ts\nconst x = { value: 1 }\n```'
    try {
      for (const directory of Object.keys(changelogs)) {
        const folder = path.join(root, 'packages', directory)
        mkdirSync(folder, { recursive: true })
        writeFileSync(
          path.join(folder, 'CHANGELOG.md'),
          directory === 'fsrs' ? `## 5.4.2\n\n${body}\n` : ''
        )
      }
      const plugin = pluginReleaseUpdates(root)
      const config = { base: '/ts-fsrs/' }
      expect(() => plugin.addPages?.(config, false)).toThrow('prepare:releases')
      expect(() => prepareReleases(root, config.base)).toThrow(
        'prepare:releases'
      )
      const snapshot = path.join(root, 'docs/.generated/releases.json')
      mkdirSync(path.dirname(snapshot), { recursive: true })
      writeFileSync(snapshot, JSON.stringify([release('v5.4.2')]))
      const progress: [number, number][] = []
      expect(
        prepareReleases(root, config.base, (done, total) =>
          progress.push([done, total])
        )
      ).toBe(3)
      expect(progress).toEqual(
        Array.from({ length: 6 }, (_, done) => [done, 5])
      )
      const manifest = path.join(generated, 'pages.json')
      const timestamp = statSync(manifest).mtimeMs
      const pages = await plugin.addPages?.(config, false)
      expect(pages).toHaveLength(3)
      expect(statSync(manifest).mtimeMs).toBe(timestamp)
      expect(
        readFileSync(path.join(generated, 'body_fsrs_5.4.2.md'), 'utf8')
      ).toBe(body)
      expect(
        readFileSync(path.join(generated, '_updates_.mdx'), 'utf8')
      ).not.toContain(body)
      expect(() => plugin.addPages?.({ base: '/' }, false)).toThrow('DOCS_BASE')

      writeFileSync(snapshot, '{ invalid JSON')
      expect(() => prepareReleases(root, config.base)).toThrow()
      expect(statSync(manifest).mtimeMs).toBe(timestamp)

      writeFileSync(snapshot, '[]')
      prepareReleases(root, config.base)
      expect(existsSync(path.join(generated, 'body_fsrs_5.4.2.md'))).toBe(false)
      expect(await plugin.addPages?.(config, true)).toHaveLength(2)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('joins exact tags to changelog sections, skips unpublished versions and platform packages', () => {
    const updates = publishedUpdates(
      [
        release('v6.0.0', { draft: true }),
        release('v5.4.2', { published_at: '2026-09-01T02:23:29Z' }),
        release('@open-spaced-repetition/binding@0.5.0'),
        release('@open-spaced-repetition/srs-kit@0.1.0'),
        release('@open-spaced-repetition/binding-darwin-arm64@0.5.0'),
        release('v5.4.1'),
      ],
      changelogs
    )
    expect(updates.map((entry) => entry.slug)).toEqual([
      'binding/0.5.0',
      'fsrs/5.4.2',
    ])
    expect(updates[1].body).toBe('### Patch Changes\n\nFixed a bug.')
    expect(updates[1].publishedAt).toBe('2026-09-01T02:23:29Z')
  })

  it('excludes prereleases and generates English paginated release lists with inline changelogs', () => {
    expect(
      publishedUpdates(
        [
          release('@open-spaced-repetition/binding@0.6.0-beta.1', {
            prerelease: true,
          }),
        ],
        changelogs
      )
    ).toEqual([])
    expect(
      publishedUpdates(
        [release('@open-spaced-repetition/binding@0.6.0-beta.1')],
        changelogs
      )
    ).toEqual([])
    const stable = publishedUpdates([release('v5.4.2')], changelogs)[0]
    const updates = Array.from({ length: 11 }, (_, i) => ({
      ...stable,
      slug: `fsrs/5.4.${i}`,
      version: `5.4.${i}`,
    }))
    const pages = updatePages(updates, '/ts-fsrs/')
    expect(pages).toHaveLength(14)
    expect(pages[0].routePath).toBe('/updates/')
    expect(pages[1].routePath).toBe('/updates/page/2')
    expect(pages[0].content).toContain('Page 1 of 2')
    expect(pages[0].content).toContain('[Older →](/updates/page/2)')
    expect(pages[1].content).toContain('[← Newer](/updates/)')
    expect(pages[1].content).not.toContain('[Older →]')
    expect(pages[0].content.match(/<ReleaseEntry /g)).toHaveLength(10)
    expect(pages[1].content.match(/<ReleaseEntry /g)).toHaveLength(1)
    expect(pages.every((p) => !p.content.includes('Subscribe via Atom'))).toBe(
      true
    )
    expect(pages.every((p) => p.routePath.startsWith('/updates/'))).toBe(true)
    expect(pages[4].content).toContain('published_at: "2026-09-11T07:30:00Z"')
  })

  it('separates package lists and keeps pagination within the selected package', () => {
    const releases = [
      release('v5.4.2'),
      release('@open-spaced-repetition/binding@0.5.0'),
    ]
    const pages = updatePages(
      publishedUpdates(releases, changelogs),
      '/ts-fsrs/'
    )
    expect(pages.some((page) => page.routePath.includes('/srs-kit/'))).toBe(
      false
    )
    expect(
      pages.some((page) => page.content.includes('/updates/srs-kit/'))
    ).toBe(false)
    const fsrs = pages.find((p) => p.routePath === '/updates/')!
    const binding = pages.find((p) => p.routePath === '/updates/binding/')!
    expect(fsrs.extension).toBe('mdx')
    expect(fsrs.content).toContain(
      "import ReleaseEntry from '@/releases/ReleaseEntry'"
    )
    expect(fsrs.content).toContain(
      "import ReleaseBody0 from './body_fsrs_5.4.2.md'"
    )
    expect(fsrs.content).toContain('<ReleaseEntry update={')
    expect(fsrs.content).not.toContain('<table')
    expect(pages.every((p) => !p.content.includes('Download .tgz'))).toBe(true)
    expect(fsrs.content).toContain('https://npmx.dev/package/ts-fsrs/v/5.4.2')
    const detail = pages.find((p) => p.routePath === '/updates/binding/0.5.0')!
    expect(detail.content).toContain('[All updates](/updates/binding/)')
    expect(detail.content).toContain(
      'https://npmx.dev/package/@open-spaced-repetition/binding/v/0.5.0'
    )
    expect(fsrs.content).not.toContain('WASM update.')
    expect(binding.content).toContain(
      "import ReleaseBody0 from './body_binding_0.5.0.md'"
    )
    expect(detail.extension).toBe('md')
    expect(detail.content).toContain('WASM update.')
    expect(binding.content).not.toContain('Fixed a bug.')
    expect(binding.content).toContain(
      'href="/ts-fsrs/updates/binding/" aria-current="page"'
    )
    expect(binding.content).toContain('pageType: "doc-wide"')
  })

  it('has empty-state indexes but removes them from serialized feeds', async () => {
    expect(updatePages([], '/')).toHaveLength(2)
    expect(updatePages([], '/')[0].content).toContain('No published releases')
    const feed = {
      items: [{ id: 'updates-index-en-US' }, { id: '/updates/fsrs/5.4.2' }],
      atom1() {
        return JSON.stringify(this.items)
      },
    }
    // Exercise the output transform with the minimal Feed surface it uses.
    const context = { feed } as unknown as Parameters<
      typeof releaseFeedOutput
    >[1]
    expect(await releaseFeedOutput('', context)).toBe(
      '[{"id":"/updates/fsrs/5.4.2"}]'
    )
  })

  it('paginates and rejects API errors and malformed data instead of returning an empty feed', async () => {
    let requests = 0
    const request: typeof fetch = async (input) => {
      requests++
      expect(String(input)).toContain(`page=${requests}`)
      return new Response(
        JSON.stringify(
          requests === 1
            ? Array.from({ length: 100 }, () => release('v5.4.2'))
            : []
        )
      )
    }
    expect(await fetchReleases(undefined, request)).toHaveLength(100)
    expect(requests).toBe(2)
    await expect(
      fetchReleases(undefined, async () => new Response('', { status: 403 }))
    ).rejects.toThrow('HTTP 403')
    await expect(
      fetchReleases(undefined, async () => new Response('{}'))
    ).rejects.toThrow()
    await expect(
      fetchReleases(undefined, async () => {
        throw new Error('network down')
      })
    ).rejects.toThrow('network down')
  })
})

it('keeps Updates indexes and pagination while excluding release details from both LLM files', () => {
  const retained = [
    '/guide/model/index.md',
    '/updates/index.md',
    '/updates/page/2.md',
    '/updates/binding/index.md',
    '/updates/binding/page/2.md',
  ]
  const removed = ['/updates/fsrs/5.4.2.md', '/updates/binding/0.5.0.md']
  for (const prefix of ['', 'https://example.com/project/zh-CN']) {
    const link = (route: string) => `${prefix}${route}`
    const index = (route: string) => `- [Updates](${link(route)}): Description.`
    const section = (route: string) =>
      `---\nurl: ${link(route)}\n---\n# Updates\n\n---\nBody\n`
    expect(
      filterReleaseDetailsFromLlms(
        [...retained, ...removed].map(index).join('\n'),
        false
      )
    ).toBe(retained.map(index).join('\n'))
    expect(
      filterReleaseDetailsFromLlms(
        [...retained, ...removed].map(section).join(''),
        true
      )
    ).toBe(retained.map(section).join(''))
  }
})
