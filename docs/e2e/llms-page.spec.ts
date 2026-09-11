import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const buildRoot = path.resolve(import.meta.dirname, '../doc_build')

const pages = [
  { locale: 'en-US', markdown: 'guide/llms.md', route: '/guide/llms' },
  {
    locale: 'zh-CN',
    markdown: 'zh-CN/guide/llms.md',
    route: '/zh-CN/guide/llms',
  },
  {
    locale: 'ja-JP',
    markdown: 'ja-JP/guide/llms.md',
    route: '/ja-JP/guide/llms',
  },
]

if (!existsSync(buildRoot)) {
  throw new Error('Missing docs/doc_build. Run pnpm docs:build first.')
}

function markdownLinks(source: string): string[] {
  return [...source.matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1])
}

for (const { locale, markdown, route } of pages) {
  // The page exists so that an agent can find the generated outputs, which
  // makes its own Markdown the thing most worth checking. SSG-MD serializes
  // JSX inside a table cell or list item verbatim, so a component that moved
  // into one would reach an agent as `<SiteFile path="..." />` while the HTML
  // kept rendering a working link.
  test(`${locale} LLM page resolves its links in Markdown`, async ({
    request,
  }) => {
    const source = readFileSync(path.join(buildRoot, markdown), 'utf8')

    expect(source, 'unrendered component in the Markdown output').not.toContain(
      '<SiteFile'
    )

    const links = markdownLinks(source)
    expect(links.length).toBeGreaterThan(0)

    for (const link of links) {
      const response = await request.get(link)
      expect(response.status(), `${link} is not reachable`).toBe(200)
    }
  })

  test(`${locale} LLM page offers the same links in both outputs`, async ({
    page,
  }) => {
    const source = readFileSync(path.join(buildRoot, markdown), 'utf8')
    await page.goto(route)

    const fromHtml = await page
      .locator('.rspress-doc a[href^="/"]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute('href'))
      )

    // A reader and an agent should be pointed at the same files. Counting links
    // would pass even if the two outputs had drifted apart.
    expect(new Set(fromHtml)).toEqual(new Set(markdownLinks(source)))
  })
}
