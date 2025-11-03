# @open-spaced-repetition/binding

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
