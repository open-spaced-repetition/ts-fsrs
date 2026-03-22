---
"@open-spaced-repetition/binding": patch
---

feat(binding): support `errorEvent` option to emit custom events for errors in WASI worker.

When enabled, worker errors are captured and dispatched as `napi-rs-worker-error` CustomEvent on `window`, allowing applications to handle WASM panics gracefully in the browser.

ref: https://github.com/toyobayashi/emnapi/issues/203
