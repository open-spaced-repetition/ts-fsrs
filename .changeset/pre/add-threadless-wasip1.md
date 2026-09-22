---
"@open-spaced-repetition/binding": minor
---

feat(binding): add the threadless `wasm32-wasip1` flavor and public workerd exports.

The threadless target keeps the Promise-based `computeParameters` and `evaluateWithTimeSeriesSplits` APIs, but executes the work synchronously on the current worker before wrapping the result in a Promise. Browser callers should use a dedicated Worker to keep the main thread responsive. Progress callbacks are supported, and returning `false` stops the operation.
