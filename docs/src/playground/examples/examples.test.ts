import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { PLAYGROUND_SCENARIOS } from '../shared/scenarios'

const examplesDir = import.meta.dirname
const exampleFiles = readdirSync(examplesDir)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .sort()

describe('playground examples', () => {
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
