# @open-spaced-repetition/srs-kit

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
