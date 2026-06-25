import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@vendor': path.resolve(import.meta.dirname, 'vendor'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.ts'],
    benchmark: {
      include: ['bench/**/*.bench.ts'],
    },
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/index.ts'],
      reporter: ['text', 'cobertura', 'html'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
})
