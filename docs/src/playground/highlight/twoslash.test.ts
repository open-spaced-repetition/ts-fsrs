import { describe, expect, it } from 'vitest'
import { collectHighlightedExportNames, keepTsFsrsTypeHover } from './twoslash'

describe('Twoslash package hover filter', () => {
  const exportNames = collectHighlightedExportNames([
    {
      content:
        'declare class SchedulerCore {}\ndeclare const FSRS6Model: unknown\nexport { SchedulerCore, FSRS6Model }',
      filePath: 'file:///node_modules/ts-fsrs/index.d.ts',
    },
    {
      content:
        'export declare function computeOptimalSteps(): void\nexport interface StepStatsResult {}',
      filePath:
        'file:///node_modules/@open-spaced-repetition/binding/index.d.ts',
    },
    {
      content: 'export { SomethingElse }',
      filePath: 'file:///node_modules/other/index.d.ts',
    },
    {
      content: 'export { SchedulerCore as A, type int as z }',
      filePath: 'file:///node_modules/ts-fsrs/types-BWO-AoEB.d.ts',
    },
  ])

  it('collects exports only from highlighted package declarations', () => {
    expect([...exportNames]).toEqual([
      'SchedulerCore',
      'FSRS6Model',
      'computeOptimalSteps',
      'StepStatsResult',
    ])
  })

  it("leaves the chunk files' one-letter aliases out", () => {
    expect(exportNames.has('A')).toBe(false)
    expect(exportNames.has('z')).toBe(false)
  })

  it('ignores names too generic to attribute', () => {
    const withInt = collectHighlightedExportNames([
      {
        content: 'export { type int }',
        filePath: 'file:///node_modules/ts-fsrs/index.d.ts',
      },
    ])
    expect(withInt.has('int')).toBe(true)
    expect(
      keepTsFsrsTypeHover(
        { type: 'hover', text: 'function int(params?: string): z.ZodInt' },
        withInt
      )
    ).toBe(false)
  })

  it('keeps hovers backed by ts-fsrs exports', () => {
    expect(
      keepTsFsrsTypeHover(
        { type: 'hover', text: 'const scheduler: SchedulerCore' },
        exportNames
      )
    ).toBe(true)
    expect(
      keepTsFsrsTypeHover(
        { type: 'hover', text: 'JSON.stringify(value: any): string' },
        exportNames
      )
    ).toBe(false)
    expect(
      keepTsFsrsTypeHover(
        { type: 'hover', text: 'function computeOptimalSteps(): void' },
        exportNames
      )
    ).toBe(true)
    expect(keepTsFsrsTypeHover({ type: 'error' }, exportNames)).toBe(true)
  })
})
