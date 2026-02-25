import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    testTimeout: 1_000 * 60 * 4,
    coverage: {
      provider: 'istanbul',
    },
  },
})