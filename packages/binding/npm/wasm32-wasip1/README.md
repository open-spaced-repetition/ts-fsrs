# `@open-spaced-repetition/binding-wasm32-wasip1`

This is the **wasm32-wasip1** binary for `@open-spaced-repetition/binding`

`computeParameters` and `evaluateWithTimeSeriesSplits` execute synchronously on the current worker and return a `Promise` for API compatibility. In browser applications, call them from a dedicated Worker to avoid blocking the main thread. Progress callbacks are supported. Returning `false` from the callback stops the operation.
