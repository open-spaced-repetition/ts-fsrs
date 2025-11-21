import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      './packages/fsrs/vitest.config.ts',
      './packages/binding/vitest.config.ts',
    ],
    coverage: {
      provider: 'istanbul',
      reportsDirectory: 'coverage',
      include: ['packages/**/src/**/*.ts'],
      reporter: ['text', 'cobertura', 'html'],
      thresholds: {
        lines: 80,
      },
    },
  },
})
