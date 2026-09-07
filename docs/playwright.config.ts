import { defineConfig } from '@playwright/test'

export default defineConfig({
  expect: { timeout: 120_000 },
  testDir: './e2e',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec rspress preview --host 127.0.0.1 --port 4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:4173',
  },
  workers: process.env.CI ? 1 : undefined,
})
