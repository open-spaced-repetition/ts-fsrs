import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectPlaygroundDeclarations } from './collect-declarations'

const workspaceRoot = path.resolve(import.meta.dirname, '../../../..')

describe('playground declarations', () => {
  const declarations = collectPlaygroundDeclarations(workspaceRoot)

  it('publishes the real ts-fsrs module entry', () => {
    const entry = declarations.find(
      ({ filePath }) => filePath === 'file:///node_modules/ts-fsrs/index.d.ts'
    )
    expect(entry?.content).toContain('declare const fsrs')
    expect(entry?.content.length).toBeGreaterThan(10_000)
  })

  it('publishes extensionless aliases for every public ts-fsrs export', () => {
    const publicDeclarationPaths = [
      'index.d.ts',
      'reschedule.d.ts',
      'middlewares/index.d.ts',
      'models/fsrs-3.d.ts',
      'models/fsrs-4.d.ts',
      'models/fsrs-4dot5.d.ts',
      'models/fsrs-5.d.ts',
      'models/fsrs-6.d.ts',
    ]
    const declarationPaths = new Set(
      declarations.map(({ filePath }) => filePath)
    )

    for (const declarationPath of publicDeclarationPaths) {
      expect(declarationPaths).toContain(
        `file:///node_modules/ts-fsrs/${declarationPath}`
      )
    }
  })

  it('points every relative import at a published declaration', () => {
    // Node10 cannot map a `./chunk.mjs` specifier onto `chunk.d.ts`, and the
    // resulting unresolved module is silent: types degrade to `any` instead of
    // erroring, which surfaces as a bogus diagnostic elsewhere in the example.
    const declarationPaths = new Set(
      declarations.map(({ filePath }) => filePath)
    )

    for (const { content, filePath } of declarations) {
      for (const [, specifier] of content.matchAll(/from "(\.[^"]+)"/g)) {
        expect(specifier).not.toMatch(/\.mjs$/)
        expect(declarationPaths).toContain(
          new URL(`${specifier}.d.ts`, filePath).href
        )
      }
    }
  })

  it('publishes no .d.mts paths', () => {
    // Monaco resolves with Node10: a `.d.mts` entry marks the module as ESM and
    // auto-import then writes `ts-fsrs/models/fsrs-6.mjs`, which the package
    // does not export and the runner cannot resolve.
    expect(
      declarations.filter(({ filePath }) => filePath.endsWith('.d.mts'))
    ).toEqual([])
  })
  it('publishes the generated WASIP1 binding contract', () => {
    const entry = declarations.find(({ filePath }) =>
      filePath.includes('binding/index.d.ts')
    )
    expect(entry?.content).toContain('function computeParameters')
    expect(entry?.content).toContain('class FSRSBinding')
  })
})
