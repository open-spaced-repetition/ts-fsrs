import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import optimizerCardIdsSource from '../../snippets/run-code/optimizer-card-ids.ts?raw'
import { prepareExampleSource } from '../shared/example-source'
import { PLAYGROUND_SCENARIOS } from '../shared/scenarios'

const examplesDir = import.meta.dirname
const exampleFiles = readdirSync(examplesDir)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .sort()

describe('playground examples', () => {
  it.each([
    'const base = import.meta.env.BASE_URL',
    `fetch(\`\${import.meta.env.BASE_URL}/\${file}\`)`,
    `fetch(\`\${import.meta.env.BASE_URL}/a\\u0020b.csv\`)`,
  ])('preserves non-static code: %s', (source) => {
    expect(prepareExampleSource(source, '/ts-fsrs/')).toBe(
      source.replaceAll('import.meta.env.BASE_URL', '"/ts-fsrs"')
    )
  })

  it.each([
    ['binding', '', '/revlog.csv'],
    ['binding', '/', '/revlog.csv'],
    ['binding', '/ts-fsrs', '/ts-fsrs/revlog.csv'],
    ['binding', '/ts-fsrs/', '/ts-fsrs/revlog.csv'],
    ['cardIds', '', '/revlog.csv'],
    ['cardIds', '/', '/revlog.csv'],
    ['cardIds', '/ts-fsrs', '/ts-fsrs/revlog.csv'],
    ['cardIds', '/ts-fsrs/', '/ts-fsrs/revlog.csv'],
  ])('%s sample under base %s', async (example, base, sampleUrl) => {
    const source =
      example === 'binding'
        ? PLAYGROUND_SCENARIOS.find(({ id }) => id === 'binding')!.code
        : optimizerCardIdsSource
    const prepared = prepareExampleSource(source, base)
    expect(prepared).not.toContain('import.meta.env.BASE_URL')
    expect(prepared).toContain(`fetch(${JSON.stringify(sampleUrl)},`)
    const { outputText } = ts.transpileModule(prepared, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    })
    // Capture the actual request without running the WASM training.
    const fetch = vi.fn().mockRejectedValue(new Error('stop before training'))
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
    const execute = new AsyncFunction(
      'require',
      'console',
      'exports',
      'fetch',
      outputText
    )
    await expect(
      execute(() => ({}), { log: vi.fn() }, {}, fetch)
    ).rejects.toThrow('stop before training')
    expect(fetch).toHaveBeenCalledExactlyOnceWith(sampleUrl, {
      cache: 'force-cache',
    })
  })

  it('backs every scenario the playground offers', () => {
    // A scenario whose source failed to load would render an empty editor
    // without failing the build.
    expect(exampleFiles).toHaveLength(PLAYGROUND_SCENARIOS.length)
    for (const scenario of PLAYGROUND_SCENARIOS) {
      expect(scenario.code.length).toBeGreaterThan(100)
    }
  })

  it.each(exampleFiles)('%s emits executable JavaScript', (name) => {
    const source = readFileSync(path.join(examplesDir, name), 'utf8')
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
      reportDiagnostics: true,
    })

    expect(
      output.diagnostics?.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      ) ?? []
    ).toEqual([])
    expect(output.outputText.length).toBeGreaterThan(100)
  })

  it.each(exampleFiles)('%s imports only published specifiers', (name) => {
    const source = readFileSync(path.join(examplesDir, name), 'utf8')
    // The runner resolves bare specifiers from a fixed map, so a relative
    // import or an unpublished subpath would only fail once the example runs.
    for (const [, specifier] of source.matchAll(/from '([^']+)'/g)) {
      expect(specifier).toMatch(/^(ts-fsrs|@open-spaced-repetition\/binding)/)
    }
  })
})
