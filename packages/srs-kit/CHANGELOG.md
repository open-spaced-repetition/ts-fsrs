# @open-spaced-repetition/srs-kit

## 1.0.0

### Major Changes

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`30d35fb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/30d35fb99c7073c265c81403ff470884df667b78) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(chrono): rename `projection` to `normalize` and `ChronoProjection` to `ChronoTimeNormalizer`.

### Minor Changes

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`fab4c67`](https://github.com/open-spaced-repetition/ts-fsrs/commit/fab4c670e33543e49e26d2810e2a93a250122cb9) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: add cached grade lookup to review candidates

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`aff2328`](https://github.com/open-spaced-repetition/ts-fsrs/commit/aff2328eafa62e78989c27bf500eb613a3f006aa) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(scheduler): add `nextInterval` queries with shared interval middleware.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`0538d20`](https://github.com/open-spaced-repetition/ts-fsrs/commit/0538d20c966e0bfa164fad1d95a4f94f6fec27c1) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(chrono): unify card and revlog time projections so rollback restores the pre-review due date

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`74f1cf8`](https://github.com/open-spaced-repetition/ts-fsrs/commit/74f1cf852d0d064de7ff43d46ec556b360f03fa9) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): add FSRS-7.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`dd4d3a9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/dd4d3a9374ffc93c9bc930c32a41f153e712263b) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): make scheduler middleware composition immutable.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`8c0375d`](https://github.com/open-spaced-repetition/ts-fsrs/commit/8c0375db6992e114e49f3d6d97bcb8cfe77f427b) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): support mapping preview results to arrays.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`341165a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/341165a47c31ef11c793c7c19ad08c456d3a2bbe) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): expose the scheduler instance in middleware handlers and the input card's retrievability in review contexts.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`e3e7e91`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e3e7e91f347778f9b4a690db64861dcf8d7da0c4) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(middleware): support per-grade desired retention on scheduler candidates.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`4732dfb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/4732dfbb4b2b9bef917b30c064c1bb3797f123f3) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(kit): simplify chrono config to share options with middleware.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`04333f6`](https://github.com/open-spaced-repetition/ts-fsrs/commit/04333f6fbdedeca8c2fbecaf50f6bbc10e8a6f9d) Thanks [@ishiko732](https://github.com/ishiko732)! - Publish `@open-spaced-repetition/srs-kit` as a public BSD-licensed package.
  
  This initial public release includes the shared SRS framework primitives used by `ts-fsrs`:
  
  - schema helpers for validating cards, review logs, models, schedulers, and middleware options;
  - schedule status and rating primitives;
  - model contracts with config validation, migration hooks, parameter clipping, and scheduler reuse support;
  - chrono contracts and presets for numeric elapsed days, `Date`, and `Temporal.Instant`;
  - middleware definition and composition helpers;
  - scheduler creation APIs for review, rollback, forget, card initialization, chrono defaults, and middleware finalization;
  - `SchedulerCore.forward` for replaying a review history into one card and revlog per review.

### Patch Changes

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`adc4554`](https://github.com/open-spaced-repetition/ts-fsrs/commit/adc455435e67debd3efb13fd8d4f035e6112da7b) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): add an optional precise `compare` operation to chronology cores and
  implement it for the Date and Temporal.Instant presets.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`21c030a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/21c030a10e6e9eb91243ec314bbceb85211bf5ef) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: separate model parameter migration, clipping, and validation

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`a73dbb2`](https://github.com/open-spaced-repetition/ts-fsrs/commit/a73dbb24a11fb060e0b3aa92997660376b17bf73) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor: Rename `ComposableScheduler` to `CustomScheduler` and `composeMiddleware` to `runMiddlewares`.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`b7deb79`](https://github.com/open-spaced-repetition/ts-fsrs/commit/b7deb794baf1f070b4954dcc26516a8bb3a6cedc) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): expose flattened scheduler config input and output types.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`1139c55`](https://github.com/open-spaced-repetition/ts-fsrs/commit/1139c5514fbd7ba2989fab7f1f76056eefc18907) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: export stats middleware APIs.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`b9d9f97`](https://github.com/open-spaced-repetition/ts-fsrs/commit/b9d9f973f061f93ebc69f7b982e794634e4f2b8a) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: restore new-card chronology during rollback.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`263dfce`](https://github.com/open-spaced-repetition/ts-fsrs/commit/263dfcecd6f7e92537c8ef6cbf3bbbbb513a06b5) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: infer middleware card initialization fields for `newCard`.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`4099540`](https://github.com/open-spaced-repetition/ts-fsrs/commit/4099540e0e61ff5e9e1c8f9aa7b29d845f911f7f) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): accept full Standard Schema types.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`b2ea08d`](https://github.com/open-spaced-repetition/ts-fsrs/commit/b2ea08db39a4255f51abc2133d8e57975530d982) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten composed schedule fields and label preview card and revlog types.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`d6aa18a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/d6aa18a40148c2562b85670415a5dff0e9b6b062) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten named card return type displays across scheduler APIs.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`7ca0459`](https://github.com/open-spaced-repetition/ts-fsrs/commit/7ca045939f6eade60d8a90520e58647e6fe0e7ae) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten composed `newCard` return type displays.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`3929a41`](https://github.com/open-spaced-repetition/ts-fsrs/commit/3929a41c9cb4e51f2dfb718b9cf3242fea845392) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): flatten preview card and revlog type displays.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`612d83b`](https://github.com/open-spaced-repetition/ts-fsrs/commit/612d83bb79dc76e061607baf4b7790311cae665a) Thanks [@ishiko732](https://github.com/ishiko732)! - perf(kit): cache middleware schemas used by scheduler validation.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`7342933`](https://github.com/open-spaced-repetition/ts-fsrs/commit/734293325a5f1c1470a7d4840eb6916f124694b1) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): preserve new-card rollback state while keeping elapsed days at zero.

- [#573](https://github.com/open-spaced-repetition/ts-fsrs/pull/573) [`dd4d3a9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/dd4d3a9374ffc93c9bc930c32a41f153e712263b) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(kit): avoid TypeScript 7 TS2590 errors in scheduler type inference.

## 1.0.0-beta.10

### Patch Changes

- [#569](https://github.com/open-spaced-repetition/ts-fsrs/pull/569) [`e574e88`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e574e8844f134c40fa01c17f7371a20263894a73) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor: Rename `ComposableScheduler` to `CustomScheduler` and `composeMiddleware` to `runMiddlewares`.

## 1.0.0-beta.9

### Minor Changes

- [#566](https://github.com/open-spaced-repetition/ts-fsrs/pull/566) [`58d902f`](https://github.com/open-spaced-repetition/ts-fsrs/commit/58d902f8aac8a35522345282891c6d52e8779fa0) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): expose the scheduler instance in middleware handlers and the input card's retrievability in review contexts.

## 1.0.0-beta.8

### Major Changes

- [#525](https://github.com/open-spaced-repetition/ts-fsrs/pull/525) [`b553cf9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/b553cf94cb4594b928cd6dec12cd467a30b1bb22) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(chrono): rename `projection` to `normalize` and `ChronoProjection` to `ChronoTimeNormalizer`.

### Minor Changes

- [#526](https://github.com/open-spaced-repetition/ts-fsrs/pull/526) [`36b37d2`](https://github.com/open-spaced-repetition/ts-fsrs/commit/36b37d27e2371f517482c30725667bf18c95d0f0) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(scheduler): add `nextInterval` queries with shared interval middleware.

- [#520](https://github.com/open-spaced-repetition/ts-fsrs/pull/520) [`e5af3b9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e5af3b9f1e1eb25d7965e08dab2ef46903f92949) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): add FSRS-7.

- [#527](https://github.com/open-spaced-repetition/ts-fsrs/pull/527) [`368b15c`](https://github.com/open-spaced-repetition/ts-fsrs/commit/368b15c5a1b36e376ee649c9ae384542ca5a1f0b) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(middleware): support per-grade desired retention on scheduler candidates.

## 0.1.0-beta.7

### Minor Changes

- [#522](https://github.com/open-spaced-repetition/ts-fsrs/pull/522) [`786c0e7`](https://github.com/open-spaced-repetition/ts-fsrs/commit/786c0e7e158321f26829ee8f728c37ece1345323) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(chrono): unify card and revlog time projections so rollback restores the pre-review due date

- [#519](https://github.com/open-spaced-repetition/ts-fsrs/pull/519) [`785736a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/785736a81b7bc0f205d96ed57feac9e80d0603a6) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(kit): simplify chrono config to share options with middleware.

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
