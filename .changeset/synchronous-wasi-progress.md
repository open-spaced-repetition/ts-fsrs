---
"@open-spaced-repetition/binding": patch
"@open-spaced-repetition/binding-wasm32-wasi": patch
"@open-spaced-repetition/binding-wasm32-wasip1": patch
---

feat: run WASI p1 training and evaluation synchronously with progress callbacks, keeping Promise return types; use a dedicated Worker in browsers.

Deprecate `wasm32-wasip1-threads` (`@open-spaced-repetition/binding-wasm32-wasi`), with removal planned for the next release; migrate to `@open-spaced-repetition/binding-wasm32-wasip1`.
