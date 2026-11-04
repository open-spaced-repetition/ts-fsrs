---
"@open-spaced-repetition/binding": patch
"@open-spaced-repetition/binding-wasm32-wasi": patch
"@open-spaced-repetition/binding-wasm32-wasip1": patch
---

fix: upgrade emnapi to 2.0.0-beta.3 for reliable WASI finalizer cleanup when host timers cannot run, and prevent TSFN finalization re-entry crashes during shutdown.
