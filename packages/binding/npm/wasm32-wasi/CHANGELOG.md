# @open-spaced-repetition/binding-wasm32-wasi

## 0.6.1

### Patch Changes

- [#608](https://github.com/open-spaced-repetition/ts-fsrs/pull/608) [`c6f5c49`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c6f5c49f8e44f179a3061f0b76fe832a4be73f1d) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: upgrade emnapi to 2.0.0-beta.3 for reliable WASI finalizer cleanup when host timers cannot run, and prevent TSFN finalization re-entry crashes during shutdown.

- [#608](https://github.com/open-spaced-repetition/ts-fsrs/pull/608) [`c6f5c49`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c6f5c49f8e44f179a3061f0b76fe832a4be73f1d) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: run WASI p1 training and evaluation synchronously with progress callbacks, keeping Promise return types; use a dedicated Worker in browsers.
  
  Deprecate `wasm32-wasip1-threads` (`@open-spaced-repetition/binding-wasm32-wasi`), with removal planned for the next release; migrate to `@open-spaced-repetition/binding-wasm32-wasip1`.

## 0.6.0

### Patch Changes

- [#594](https://github.com/open-spaced-repetition/ts-fsrs/pull/594) [`aef6758`](https://github.com/open-spaced-repetition/ts-fsrs/commit/aef6758aab08abdad7553831a5cf20569d839e35) Thanks [@ishiko732](https://github.com/ishiko732)! - chore: update NAPI-RS and WASI dependencies

## 0.6.0-beta.7

No changes in this release.

## 0.6.0-beta.6

No changes in this release.

## 0.6.0-beta.5

No changes in this release.

## 0.6.0-beta.4

No changes in this release.

## 0.6.0-beta.3

## 0.6.0-beta.2

## 0.6.0-beta.1

## 0.6.0-beta.0

## 0.5.0

## 0.4.0

## 0.3.1

## 0.3.0

## 0.2.1

## 0.2.0

## 0.1.2

## 0.1.1

## 0.1.0
