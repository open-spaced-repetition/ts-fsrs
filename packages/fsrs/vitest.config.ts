import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^ts-fsrs\/(.+)$/,
        replacement: path.resolve(__dirname, './src/$1'),
      },
      {
        find: /^ts-fsrs$/,
        replacement: path.resolve(__dirname, './src/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    include: [
      '**/__tests__/*.ts?(x)',
      '**/__tests__/**/*.ts?(x)',
      'src/**/*.(spec|test).ts?(x)',
    ],
    // Run `expectTypeOf`/`assertType` assertions in spec files as part of every
    // `vitest run`, so type-level regressions fail the normal test suite.
    typecheck: {
      enabled: true,
      include: ['src/**/*.spec.ts?(x)'],
    },
    testTimeout: 1_000 * 60 * 1,
    coverage: {
      provider: 'istanbul',
    },
  },
})
