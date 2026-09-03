import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = dirname(fileURLToPath(import.meta.url))
const snippetPath = '../../snippets/run-code/define-scheduler.ts'
const snippetImport = '@/snippets/run-code/define-scheduler.ts?raw'

describe('defineScheduler guide source', () => {
  it('uses one file for the Markdown code block and Worker input', () => {
    const snippet = readFileSync(join(root, snippetPath), 'utf8')
    expect(snippet).toContain('defineScheduler({')

    for (const locale of ['en-US', 'zh-CN', 'ja-JP']) {
      const quickStart = readFileSync(
        join(root, '../..', locale, 'guide/quick-start.mdx'),
        'utf8'
      )
      expect(quickStart).toContain(`from '${snippetImport}'`)
      expect(quickStart).toContain(`\`\`\`ts twoslash file="${snippetPath}"`)
      expect(quickStart).toContain('PackageManagerTabs')

      const intro = readFileSync(
        join(root, '../..', locale, 'guide/index.mdx'),
        'utf8'
      )
      expect(intro).toContain('<Prompt')

      const nav = readFileSync(join(root, '../..', locale, '_nav.json'), 'utf8')
      expect(nav).toContain('"link": "/guide/"')
      expect(nav).not.toMatch(/installation|define-scheduler/)
      expect(JSON.parse(nav)).not.toContainEqual(
        expect.objectContaining({ link: '/' })
      )
    }
  })
})
