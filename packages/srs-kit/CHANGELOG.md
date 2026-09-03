# @open-spaced-repetition/srs-kit

## 0.1.0-beta.7

### Patch Changes

- [#492](https://github.com/open-spaced-repetition/ts-fsrs/pull/492) [`3db41a4`](https://github.com/open-spaced-repetition/ts-fsrs/commit/3db41a48d21a9c7d1e6a44ee772df1302402171e) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: separate model parameter migration, clipping, and validation

- [#493](https://github.com/open-spaced-repetition/ts-fsrs/pull/493) [`c186b67`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c186b67a4cc025388561f873025cfc51caf13410) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): expose flattened scheduler config input and output types.

- [#503](https://github.com/open-spaced-repetition/ts-fsrs/pull/503) [`212e311`](https://github.com/open-spaced-repetition/ts-fsrs/commit/212e3112aba2107d55a247d2cbd94e6e96d9e70f) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten named card return type displays across scheduler APIs.

- [#495](https://github.com/open-spaced-repetition/ts-fsrs/pull/495) [`0cfeb96`](https://github.com/open-spaced-repetition/ts-fsrs/commit/0cfeb96b4cfdc0477c3eef31c8284ef3326b99ef) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten composed `newCard` return type displays.

## 0.1.0-beta.6

### Minor Changes

- [#471](https://github.com/open-spaced-repetition/ts-fsrs/pull/471) [`7c1f873`](https://github.com/open-spaced-repetition/ts-fsrs/commit/7c1f873a7780950d07de7777a6589182d7392c39) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): support mapping preview results to arrays.

### Patch Changes

- [#476](https://github.com/open-spaced-repetition/ts-fsrs/pull/476) [`3135797`](https://github.com/open-spaced-repetition/ts-fsrs/commit/3135797b0236f26a24bfa5b5ed05a0514ce8ae56) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten composed schedule fields and label preview card and revlog types.

- [#472](https://github.com/open-spaced-repetition/ts-fsrs/pull/472) [`21798ad`](https://github.com/open-spaced-repetition/ts-fsrs/commit/21798ad21d9d5d1a632e49545c85b79d63745b93) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten preview card and revlog type displays.

## 0.1.0-beta.5

### Patch Changes

- [#466](https://github.com/open-spaced-repetition/ts-fsrs/pull/466) [`5f79a74`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5f79a745e8c0700b7da9bb5077b7853b0cedad0e) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): preserve new-card rollback state while keeping elapsed days at zero.

## 0.1.0-beta.4

### Patch Changes

- [#464](https://github.com/open-spaced-repetition/ts-fsrs/pull/464) [`87c828f`](https://github.com/open-spaced-repetition/ts-fsrs/commit/87c828ff9d856b81d4dffd612d7768328fde3864) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): accept full Standard Schema types.

## 0.1.0-beta.3

### Patch Changes

- [#460](https://github.com/open-spaced-repetition/ts-fsrs/pull/460) [`1e89bb8`](https://github.com/open-spaced-repetition/ts-fsrs/commit/1e89bb8d8c942a7e0989b0eced3632e73b494958) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: export stats middleware APIs.

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
