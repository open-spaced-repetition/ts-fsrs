# @open-spaced-repetition/binding

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
