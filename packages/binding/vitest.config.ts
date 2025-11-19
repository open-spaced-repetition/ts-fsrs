import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^(\\.{1,2}\/.*)\.js$/,
        replacement: '$1',
      },
      {
        find: /^@open-spaced-repetition\/binding$/,
        replacement: path.resolve(__dirname, './dist/index.mjs'),
      },
      {
        find: /^@open-spaced-repetition\/binding\/index\.js$/,
        replacement: path.resolve(__dirname, './dist/index.mjs'),
      },
      {
        find: /^@open-spaced-repetition\/binding\/(.+)$/,
        replacement: path.resolve(__dirname, './dist/$1'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      enabled: true,
      reporter: ['text', 'cobertura', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/__tests__/**'],
      thresholds: {
        lines: 80,
      },
    },
    include: ['**/__tests__/*.spec.ts?(x)', '**/__tests__/*.test.ts?(x)'],
  },
})
