'use client'

import { initOptimizer } from '@open-spaced-repetition/binding/dynamic'

let optimizer: ReturnType<typeof initOptimizer> | undefined

export function getOptimizer() {
  optimizer ??= initOptimizer({
    wasm: new URL(
      '@open-spaced-repetition/binding-wasm32-wasi/fsrs-binding.wasm32-wasi.wasm',
      import.meta.url
    ),
    worker: () =>
      new Worker(
        new URL(
          '@open-spaced-repetition/binding-wasm32-wasi/wasi-worker-browser.mjs',
          import.meta.url
        ),
        { type: 'module' }
      ),
    errorEvent: true,
  })
  return optimizer
}
