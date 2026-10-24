# @open-spaced-repetition/binding

## 0.6.0

### Breaking Changes

- Remove `@open-spaced-repetition/binding-win32-ia32-msvc` and the `i686-pc-windows-msvc` build target. Native 32-bit Windows builds are no longer supported; Windows x64 and ARM64 packages remain available. ([#429](https://github.com/open-spaced-repetition/ts-fsrs/pull/429)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Require Node.js 24 or later and use an ESM default loader. Threaded WASI initialization is exposed through `./dynamic`; `./dynamic-wasi` remains an alias. ([#406](https://github.com/open-spaced-repetition/ts-fsrs/pull/406), [#431](https://github.com/open-spaced-repetition/ts-fsrs/pull/431)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Resolve timezones in Rust for CSV conversion instead of accepting a JavaScript offset callback. Use `convertCsvToFsrsItems(data, nextDayStartsAt, timezoneOrOffset, modelVersion?)`, with an IANA timezone name or a fixed UTC offset in minutes; IANA offsets are resolved per review timestamp, including daylight saving transitions. ([#384](https://github.com/open-spaced-repetition/ts-fsrs/pull/384), [#550](https://github.com/open-spaced-repetition/ts-fsrs/pull/550)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Default optimizer/model workflows to FSRS-7, with fast stability and fractional study-day intervals. Set `modelVersion: 'FSRS-6'` explicitly for FSRS-6 training/evaluation and pass `'FSRS-6'` to CSV conversion to retain whole study-day intervals. Use the same model version throughout conversion, training, and evaluation. `new FSRSBinding()` (or an empty parameter array) also defaults to FSRS-7; pass an explicit FSRS-6 parameter vector to retain FSRS-6 in that constructor. ([#530](https://github.com/open-spaced-repetition/ts-fsrs/pull/530)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Require an explicit positive numeric decay for `computeOptimalSteps`: FSRS-4 uses `1`, FSRS-4.5/5 use `0.5`, and FSRS-6 uses `weights[20]`. This single-decay fitting API does not support the FSRS-7 mixture curve. ([#538](https://github.com/open-spaced-repetition/ts-fsrs/pull/538)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Memory-state JSON serialization now includes `stability_fast`. Update strict stored-data schemas and preserve this field for FSRS-7; do not treat an FSRS-6 memory state as a complete FSRS-7 state. ([#530](https://github.com/open-spaced-repetition/ts-fsrs/pull/530)) Thanks [@ishiko732](https://github.com/ishiko732)!

### New Features

- `FSRSBindingReview.deltaT` preserves fractional elapsed days, and `FSRSBinding.nextStates` accepts fractional days for FSRS-7 while retaining whole-day behavior for FSRS-6. `BindingMemoryState(stability, difficulty, stabilityFast?)` adds a `stabilityFast` getter; the optional constructor argument defaults to `stability` for compatibility. ([#530](https://github.com/open-spaced-repetition/ts-fsrs/pull/530)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Add the threadless `@open-spaced-repetition/binding-wasm32-wasip1` package, including its `/workerd` and `/wasm` exports. The trainer can run across Node.js, browser Workers, and Cloudflare Workers/workerd using the appropriate native or WebAssembly entry. The threadless WASIp1 build requires no COOP/COEP headers or shared memory, so static sites hosted on GitHub Pages can run training locally in a browser Worker without a training backend. See the [optimizer guide](https://open-spaced-repetition.github.io/ts-fsrs/guide/optimizer/) and [live playground](https://open-spaced-repetition.github.io/ts-fsrs/playground). Training and time-series evaluation retain Promise-based APIs but execute synchronously on the current worker; use a dedicated Worker in browsers. Progress callbacks are supported, and returning `false` stops the operation. ([#432](https://github.com/open-spaced-repetition/ts-fsrs/pull/432), [#433](https://github.com/open-spaced-repetition/ts-fsrs/pull/433)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Accept `ReadableStream<Uint8Array>` input for CSV conversion. ([#447](https://github.com/open-spaced-repetition/ts-fsrs/pull/447)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Add `convertCsvToFsrsItemsWithCardIds` and card IDs in training/evaluation workflows, preserving card identity across converted review items. ([#553](https://github.com/open-spaced-repetition/ts-fsrs/pull/553)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Add `enableSchedPenalties` for FSRS-7 training and evaluation. ([#558](https://github.com/open-spaced-repetition/ts-fsrs/pull/558)) Thanks [@ishiko732](https://github.com/ishiko732)!

### Fixes and Dependencies

- Validate optimizer inputs and bound review-history expansion. `FSRSBindingItem` rejects review ratings outside 1–4, including Manual, and supplied `cardIds` must match the item count. ([#550](https://github.com/open-spaced-repetition/ts-fsrs/pull/550), [#553](https://github.com/open-spaced-repetition/ts-fsrs/pull/553)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Fix dynamic loader cleanup after asynchronous work and update native/WASI dependencies and binding validation. ([#536](https://github.com/open-spaced-repetition/ts-fsrs/pull/536), [#594](https://github.com/open-spaced-repetition/ts-fsrs/pull/594)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Incorporate upstream training/evaluation fixes and update fsrs-rs to revision `d7f337b`. ([#571](https://github.com/open-spaced-repetition/ts-fsrs/pull/571), [#600](https://github.com/open-spaced-repetition/ts-fsrs/pull/600)) Thanks [@ishiko732](https://github.com/ishiko732)!

## 0.5.0

### Minor Changes

- [#381](https://github.com/open-spaced-repetition/ts-fsrs/pull/381) [`18562c4`](https://github.com/open-spaced-repetition/ts-fsrs/commit/18562c426a4288ff0722b737fd06fe2746a5716f) Thanks [@ishiko732](https://github.com/ishiko732)! - chore(binding): upgrade fsrs to the published 6.5.0 crate and support passing trainingConfig to parameter training APIs

## 0.4.0

### Minor Changes

- [#379](https://github.com/open-spaced-repetition/ts-fsrs/pull/379) [`7479e74`](https://github.com/open-spaced-repetition/ts-fsrs/commit/7479e74cf555d7dccb31c5693c431ab7d639ad55) Thanks [@ishiko732](https://github.com/ishiko732)! - chore(binding): remove the Burn dependency. Upgrade `fsrs` to the published `6.4.0` crate (no longer requires the custom burn fork), drop the `[patch.crates-io.burn]`/`[patch.crates-io.burn-train]` workspace patches, and delete the `burn-v0.17.1-sys-metrics.wasm32` patch.

## 0.3.1

### Patch Changes

- [#364](https://github.com/open-spaced-repetition/ts-fsrs/pull/364) [`c50e027`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c50e0277e51d661560efdd833d3b3e00d6b5e35b) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(binding): implement `memoryStateFromSM2` method for FSRSBinding

## 0.3.0

### Minor Changes

- [#325](https://github.com/open-spaced-repetition/ts-fsrs/pull/325) [`948e3cd`](https://github.com/open-spaced-repetition/ts-fsrs/commit/948e3cd3cc2d2717bd0bfd6e7c9cbda7cfae98ed) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(binding): add `computeOptimalSteps` to analyze revlog and recommend optimal learning/relearning steps

  Compute optimal learning/relearning steps from CSV revlog data.
  Analyzes review history by rating groups, fits forgetting curves via golden-section search,
  and recommends step durations based on desired retention and decay parameters.

### Patch Changes

- [#327](https://github.com/open-spaced-repetition/ts-fsrs/pull/327) [`e089f2f`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e089f2fe888298c99d1d68285f1dfa1697cea7f8) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: Build the binding packages with Rust 1.94.1 and invalidate Turborepo caches when CI configuration changes.

- [#329](https://github.com/open-spaced-repetition/ts-fsrs/pull/329) [`5cd8949`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5cd8949544788224eada1b2e6f8597756ca594cb) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: include README, localized package docs, and license files in the published binding tarball

## 0.2.1

### Patch Changes

- [#319](https://github.com/open-spaced-repetition/ts-fsrs/pull/319) [`d80230e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/d80230ebbf43c4ae470e392cca14be98dffa0063) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(binding): worker and WASM path issues in the export flow to prevent Webpack and Turbopack resolution errors.

- [#319](https://github.com/open-spaced-repetition/ts-fsrs/pull/319) [`d80230e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/d80230ebbf43c4ae470e392cca14be98dffa0063) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(binding): bump @emnapi/core and @emnapi/runtime to ^1.9.0 to avoid `Cannot read properties of undefined (reading 'whenLoaded')` error.

  ref: https://github.com/toyobayashi/emnapi/issues/202

- [#319](https://github.com/open-spaced-repetition/ts-fsrs/pull/319) [`d80230e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/d80230ebbf43c4ae470e392cca14be98dffa0063) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(binding): support `errorEvent` option to emit custom events for errors in WASI worker.

  When enabled, worker errors are captured and dispatched as `napi-rs-worker-error` CustomEvent on `window`, allowing applications to handle WASM panics gracefully in the browser.

  ref: https://github.com/toyobayashi/emnapi/issues/203

## 0.2.0

### Minor Changes

- [#272](https://github.com/open-spaced-repetition/ts-fsrs/pull/272) [`23ec7a9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/23ec7a947d305f2fb3055653052c43b253b43b9d) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(binding): refactor progress callback to support training interruption

  BREAKING CHANGES:

  - progress callback no longer supports async functions, because call_with_return_value does not support asynchronous execution. See Node.js N-API documentation: https://nodejs.org/api/n-api.html#n_api_napi_call_threadsafe_function

- [#309](https://github.com/open-spaced-repetition/ts-fsrs/pull/309) [`7c0d97c`](https://github.com/open-spaced-repetition/ts-fsrs/commit/7c0d97c8f60f0203e07282e6c23ec2adb54dc352) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(binding): add `initOptimizer` dynamic loader for custom wasm/worker resources

  - Export `./dynamic-wasi` entry from `binding` with `initOptimizer(options)` for Node.js and browser
  - Export `./wasi-worker` and `./wasm` entries from `binding-wasm32-wasi` for resolving worker and wasm paths
  - Allows users to provide wasm binary (Buffer, URL, Response) and worker (factory, instance, path) externally

### Patch Changes

- [#271](https://github.com/open-spaced-repetition/ts-fsrs/pull/271) [`1f8cf5e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/1f8cf5ec441eca658c70f03eb3c3355a8d0e7300) Thanks [@ishiko732](https://github.com/ishiko732)! - add universal_metrics method for FSRS evaluation

- [#313](https://github.com/open-spaced-repetition/ts-fsrs/pull/313) [`36c6066`](https://github.com/open-spaced-repetition/ts-fsrs/commit/36c6066dab36ff20179cb7324205c2406cdb8581) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(binding): avoid wasm dead-code warnings in `compute_parameters` task

- [#269](https://github.com/open-spaced-repetition/ts-fsrs/pull/269) [`ae7775c`](https://github.com/open-spaced-repetition/ts-fsrs/commit/ae7775cce73396b2a7cce8f890914b54085ec1f5) Thanks [@ishiko732](https://github.com/ishiko732)! - add evaluation method

- [#295](https://github.com/open-spaced-repetition/ts-fsrs/pull/295) [`014ad22`](https://github.com/open-spaced-repetition/ts-fsrs/commit/014ad221d88761fd21b59944371354672b908f98) Thanks [@ishiko732](https://github.com/ishiko732)! - add evaluate_with_time_series_splits

## 0.1.2

### Patch Changes

- [#246](https://github.com/open-spaced-repetition/ts-fsrs/pull/246) [`cd2c43a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/cd2c43aafab831a8a1808fcf6ffaef79ed55ec28) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(binding): ensure convert items are sorted by review time

## 0.1.1

### Patch Changes

- [#241](https://github.com/open-spaced-repetition/ts-fsrs/pull/241) [`f2b700d`](https://github.com/open-spaced-repetition/ts-fsrs/commit/f2b700db6e53d43410f3dbd8b5f6d3e7a35d6e80) Thanks [@ishiko732](https://github.com/ishiko732)! - Fix missing build artifacts in the binding package and ensure .js, .cjs, .mjs, and .d.ts files are properly included in the distributed package.

## 0.1.0

### Minor Changes

- [#237](https://github.com/open-spaced-repetition/ts-fsrs/pull/237) [`c1d61fe`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c1d61fe302536ee901699e5d55329e5f6dee62b4) Thanks [@ishiko732](https://github.com/ishiko732)! - # @open-spaced-repetition/binding v0.1.0

  🎉 Release the first version of the high-performance FSRS optimizer based on [fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs) and [napi-rs](https://napi.rs/).

  ## Features

  - **High-Performance Parameter Optimization**: Native Rust implementation for computationally intensive FSRS parameter optimization
  - **Multi-Platform Support**: Pre-built binaries for 11 platforms:
    - Windows: x64, ia32, arm64 (MSVC)
    - macOS: x64, arm64 (Darwin)
    - Linux: x64/arm64 (GNU/MUSL)
    - Android: arm64
    - WebAssembly: wasm32-wasip1-threads
  - **Core APIs**:
    - `computeParameters()`: Optimize FSRS parameters from review history
    - `convertCsvToFsrsItems()`: Convert CSV review logs to FSRS data format
    - `FSRSBinding`: FSRS scheduler instance for memory state calculations

  ## Requirements

  - Node.js >= 20.0.0
  - For WebAssembly: Additional package manager configuration required

  ## Limitations

  - ⚠️ **Beta Notice**: API may change in future releases
  - Cannot run in edge-runtime environments (edge-runtime does not support WASI)

  ## Documentation

  See [README.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/README.md#open-spaced-repetitionbinding-optimizer) for installation instructions and usage examples.
