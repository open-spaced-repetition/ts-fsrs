import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      'packages/*',
      '!packages/binding/npm/*'
    ],
    coverage: {
      provider: 'istanbul',
      reportsDirectory: 'coverage',
      include: ['packages/**/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      reporter: ['text', 'cobertura', 'html'],
      thresholds: {
        lines: 80,
      },
    },
  },
})
