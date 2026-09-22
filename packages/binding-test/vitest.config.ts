import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    env: process.env.FSRS_BINDING_WASI_FLAVOR
      ? { NAPI_RS_WASI_FLAVOR: process.env.FSRS_BINDING_WASI_FLAVOR }
      : {},
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@emnapi/runtime', '@napi-rs/wasm-runtime'],
      },
    },
    testTimeout: 1_000 * 60 * 4,
    coverage: {
      provider: 'istanbul',
      exclude: ['src/helpers/**', 'src/examples/**'],
    },
  },
})
