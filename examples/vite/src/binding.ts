import { initOptimizer } from '@open-spaced-repetition/binding/dynamic'
import wasmUrl from '@open-spaced-repetition/binding-wasm32-wasi/fsrs-binding.wasm32-wasi.wasm?url'
import WasiWorker from '@open-spaced-repetition/binding-wasm32-wasi/wasi-worker-browser.mjs?worker'

const optimizer = initOptimizer({
  wasm: wasmUrl,
  worker: () => new WasiWorker(),
  errorEvent: true,
})

export function getOptimizer() {
  return optimizer
}
