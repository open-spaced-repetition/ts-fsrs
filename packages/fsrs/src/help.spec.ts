import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { build } from 'tsdown'
import { expect, it, vi } from 'vitest'
import { roundTo } from './help'

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'fsrs-rounding-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

it('rounds by default', () => {
  expect(roundTo(1.23456789, 3)).toBe(1.235)
  expect(roundTo(1.23456789, 0)).toBe(1)
})

it('returns the input when rounding is disabled', () => {
  // Vitest proxies import.meta.env to process.env; stubEnv coerces custom flags to strings.
  vi.stubGlobal('process', {
    ...process,
    env: { ...process.env, TS_FSRS_DISABLE_ROUNDING: true },
  })
  try {
    expect(roundTo(1.23456789, 3)).toBe(1.23456789)
    expect(roundTo(-0, 3)).toBe(-0)
  } finally {
    vi.unstubAllGlobals()
  }
})

it.each([false, true])(
  'folds the rounding flag (%s) without minification',
  async (disabled) =>
    withTempDir(async (outDir) => {
      expect(path.dirname(outDir)).toBe(path.resolve(tmpdir()))
      await build({
        config: false,
        entry: { help: path.resolve(import.meta.dirname, 'help.ts') },
        outDir,
        format: ['esm', 'cjs', 'umd'],
        globalName: 'Helpers',
        env: { TS_FSRS_DISABLE_ROUNDING: disabled },
        minify: false,
        dts: false,
        logLevel: 'silent',
      })
      for (const file of ['help.mjs', 'help.cjs', 'help.umd.js']) {
        const code = await readFile(path.join(outDir, file), 'utf8')
        expect(code).not.toContain('TS_FSRS_DISABLE_ROUNDING')
        expect(code).not.toContain('import.meta')
        const body = code.match(
          /function roundTo\([^)]*\) \{([\s\S]*?)\n\s*\}/
        )?.[1]
        expect(body).toBeDefined()
        expect(body).not.toMatch(/\bif\b/)
        expect(body?.includes('Math.round')).toBe(!disabled)
        const result = runInNewContext(
          `(function(num, decimals) {${body}})(1.23456789, 3)`
        )
        expect(result).toBe(disabled ? 1.23456789 : 1.235)
      }
    })
)
