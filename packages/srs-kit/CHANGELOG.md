# @open-spaced-repetition/srs-kit

## 0.1.0-beta.2

### Minor Changes

- [#454](https://github.com/open-spaced-repetition/ts-fsrs/pull/454) [`bfa1a84`](https://github.com/open-spaced-repetition/ts-fsrs/commit/bfa1a841e508c030277994e38b81f202122dfe38) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: add cached grade lookup to review candidates

### Patch Changes

- [#453](https://github.com/open-spaced-repetition/ts-fsrs/pull/453) [`5e06a6a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5e06a6a978b0609cb93a087cd8f3e9d89b837b9c) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: restore new-card chronology during rollback.

- [#450](https://github.com/open-spaced-repetition/ts-fsrs/pull/450) [`a19f2e6`](https://github.com/open-spaced-repetition/ts-fsrs/commit/a19f2e6bcbfc50d4c4a5942d1fb4c5b08430eff0) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: infer middleware card initialization fields for `newCard`.

- [#442](https://github.com/open-spaced-repetition/ts-fsrs/pull/442) [`b66e2c7`](https://github.com/open-spaced-repetition/ts-fsrs/commit/b66e2c7be48d1dca3af163b2f19af45cd6a3a0cb) Thanks [@ishiko732](https://github.com/ishiko732)! - perf(kit): cache middleware schemas used by scheduler validation.

## 0.1.0-beta.1

### Patch Changes

- [#435](https://github.com/open-spaced-repetition/ts-fsrs/pull/435) [`5915e9e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5915e9e8807d319a5e268a378ea8f337fca0d350) Thanks [@Eijnewgnaw](https://github.com/Eijnewgnaw)! - feat(kit): add an optional precise `compare` operation to chronology cores and
  implement it for the Date and Temporal.Instant presets.

## 0.1.0-beta.0

### Minor Changes

- [#423](https://github.com/open-spaced-repetition/ts-fsrs/pull/423) [`784cfdb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/784cfdbbee0e7bda5070bb3e3142c6ce14a3e7c3) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): make scheduler middleware composition immutable.

- [#418](https://github.com/open-spaced-repetition/ts-fsrs/pull/418) [`85eeb71`](https://github.com/open-spaced-repetition/ts-fsrs/commit/85eeb7164779c1d6a21150e1962fe451c02748df) Thanks [@ishiko732](https://github.com/ishiko732)! - Publish `@open-spaced-repetition/srs-kit` as a public BSD-licensed package.

  This initial public release includes the shared SRS framework primitives used by `ts-fsrs`:

  - schema helpers for validating cards, review logs, models, schedulers, and middleware options;
  - schedule status and rating primitives;
  - model contracts with config validation, migration hooks, parameter clipping, and scheduler reuse support;
  - chrono contracts and presets for numeric elapsed days, `Date`, and `Temporal.Instant`;
  - middleware definition and composition helpers;
  - scheduler creation APIs for review, rollback, forget, card initialization, chrono defaults, and middleware finalization.

### Patch Changes

- [#423](https://github.com/open-spaced-repetition/ts-fsrs/pull/423) [`784cfdb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/784cfdbbee0e7bda5070bb3e3142c6ce14a3e7c3) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): avoid TypeScript 7 TS2590 errors in scheduler type inference.
