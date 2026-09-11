import { describe, expect, it } from 'vitest'
import {
  fetchReleases,
  publishedUpdates,
  type Release,
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
  binding: '## 0.5.0\n\nWASM update.\n',
  'srs-kit': '## 0.1.0-beta.7\n\nBeta update.\n',
}

describe('published release updates', () => {
  it('joins exact tags to changelog sections, skips unpublished versions and platform packages', () => {
    const updates = publishedUpdates(
      [
        release('v6.0.0', { draft: true }),
        release('v5.4.2', { published_at: '2026-09-01T02:23:29Z' }),
        release('@open-spaced-repetition/binding@0.5.0'),
        release('@open-spaced-repetition/srs-kit@0.1.0-beta.7', {
          published_at: null,
        }),
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

  it('excludes prereleases and generates English paginated tables with inline changelogs', () => {
    expect(
      publishedUpdates(
        [
          release('@open-spaced-repetition/srs-kit@0.1.0-beta.7', {
            prerelease: true,
          }),
        ],
        changelogs
      )
    ).toEqual([])
    expect(
      publishedUpdates(
        [release('@open-spaced-repetition/srs-kit@0.1.0-beta.7')],
        changelogs
      )
    ).toEqual([])
    const stable = publishedUpdates([release('v5.4.2')], changelogs)[0]
    const updates = Array.from({ length: 11 }, (_, i) => ({
      ...stable,
      slug: `fsrs/5.4.${i}`,
    }))
    const pages = updatePages(updates, '/ts-fsrs/')
    expect(pages).toHaveLength(15)
    expect(pages[0].routePath).toBe('/updates/')
    expect(pages[1].routePath).toBe('/updates/page/2')
    expect(pages[0].content).toContain('Page 1 of 2')
    expect(pages[0].content).toContain('[Older →](/updates/page/2)')
    expect(pages[1].content).toContain('[← Newer](/updates/)')
    expect(pages[1].content).not.toContain('[Older →]')
    expect(pages[0].content.match(/Fixed a bug\./g)).toHaveLength(10)
    expect(pages[1].content.match(/Fixed a bug\./g)).toHaveLength(1)
    expect(pages[0].content).toContain('/ts-fsrs/rss/updates.xml')
    expect(pages.every((p) => p.routePath.startsWith('/updates/'))).toBe(true)
    expect(pages[4].content).toContain('published_at: "2026-09-11T07:30:00Z"')
  })

  it('separates package tables and keeps pagination within the selected package', () => {
    const releases = [
      release('v5.4.2'),
      release('@open-spaced-repetition/binding@0.5.0'),
    ]
    const pages = updatePages(
      publishedUpdates(releases, changelogs),
      '/ts-fsrs/'
    )
    const fsrs = pages.find((p) => p.routePath === '/updates/')!
    const binding = pages.find((p) => p.routePath === '/updates/binding/')!
    expect(fsrs.content).toContain('Fixed a bug.')
    expect(fsrs.content).not.toContain('WASM update.')
    expect(binding.content).toContain('WASM update.')
    expect(binding.content).not.toContain('Fixed a bug.')
    expect(binding.content).toContain(
      'href="/ts-fsrs/updates/binding/" aria-current="page"'
    )
    expect(binding.content).toContain('pageType: doc-wide')
  })

  it('has empty-state indexes but removes them from serialized feeds', async () => {
    expect(updatePages([], '/')).toHaveLength(3)
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
