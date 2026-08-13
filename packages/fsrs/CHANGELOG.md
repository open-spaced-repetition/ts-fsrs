# ts-fsrs

## 6.0.0-beta.2

### Major Changes

- [#451](https://github.com/open-spaced-repetition/ts-fsrs/pull/451) [`75c4608`](https://github.com/open-spaced-repetition/ts-fsrs/commit/75c46085e59054392e2f1cebfc4b9a006faa07ea) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: add the srs-kit-backed `DefaultScheduler` API.

- [#457](https://github.com/open-spaced-repetition/ts-fsrs/pull/457) [`a3b47b0`](https://github.com/open-spaced-repetition/ts-fsrs/commit/a3b47b09476fa906b32fe65cbb3df7b700bf2da9) Thanks [@ishiko732](https://github.com/ishiko732)! - chore: move legacy scheduler models, types, constants, and helpers behind the
  legacy barrel while re-exporting SRS primitives and schemas from srs-kit and
  the FSRS memory-state schema.

### Minor Changes

- [#449](https://github.com/open-spaced-repetition/ts-fsrs/pull/449) [`4efbd87`](https://github.com/open-spaced-repetition/ts-fsrs/commit/4efbd87891ddc49e7ecc5d040e7b2db29df13f04) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): add desired retention middleware and remove the exported `CardId` type.

- [#445](https://github.com/open-spaced-repetition/ts-fsrs/pull/445) [`9a964e2`](https://github.com/open-spaced-repetition/ts-fsrs/commit/9a964e2f0a4628c2c54aeecf47f1b80a9f0ff641) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): expose `defineMiddleware` and built-in middlewares.

### Patch Changes

- [#454](https://github.com/open-spaced-repetition/ts-fsrs/pull/454) [`bfa1a84`](https://github.com/open-spaced-repetition/ts-fsrs/commit/bfa1a841e508c030277994e38b81f202122dfe38) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: preserve explicit learning-step intervals while keeping graduation intervals monotonic, and require `maximumInterval` to be a positive integer.

- [#456](https://github.com/open-spaced-repetition/ts-fsrs/pull/456) [`8852cbb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/8852cbbf6d2470e9e67fd6e32e4e3019449434d4) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: enforce maximum intervals independently of fuzzing.

- [#443](https://github.com/open-spaced-repetition/ts-fsrs/pull/443) [`6cd7d55`](https://github.com/open-spaced-repetition/ts-fsrs/commit/6cd7d554a909086842f7694cb8472c68cdd78402) Thanks [@ishiko732](https://github.com/ishiko732)! - perf(middleware): avoid redundant model interval and schedule array calculations.

- [#458](https://github.com/open-spaced-repetition/ts-fsrs/pull/458) [`7b6060b`](https://github.com/open-spaced-repetition/ts-fsrs/commit/7b6060b1f8824969b99017ca2a0be41b515020cd) Thanks [@ishiko732](https://github.com/ishiko732)! - test: cover legacy exports, the FSRS memory-state schema export, strict
  primitive schemas, and the optional maximum interval branch.
- Updated dependencies [[`bfa1a84`](https://github.com/open-spaced-repetition/ts-fsrs/commit/bfa1a841e508c030277994e38b81f202122dfe38), [`5e06a6a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5e06a6a978b0609cb93a087cd8f3e9d89b837b9c), [`a19f2e6`](https://github.com/open-spaced-repetition/ts-fsrs/commit/a19f2e6bcbfc50d4c4a5942d1fb4c5b08430eff0), [`b66e2c7`](https://github.com/open-spaced-repetition/ts-fsrs/commit/b66e2c7be48d1dca3af163b2f19af45cd6a3a0cb)]:
  - @open-spaced-repetition/srs-kit@0.1.0-beta.2

## 6.0.0-beta.1

### Minor Changes

- [#426](https://github.com/open-spaced-repetition/ts-fsrs/pull/426) [`5bc6a40`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5bc6a406ee93fb505a7fab70d86d7c2b901905d6) Thanks [@Eijnewgnaw](https://github.com/Eijnewgnaw)! - feat(kit): add a `Reschedule` class that replays a review history into memory
  states (`replay`) or into the card and revlog of each review (`reschedule`).

### Patch Changes

- Updated dependencies [[`5915e9e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5915e9e8807d319a5e268a378ea8f337fca0d350)]:
  - @open-spaced-repetition/srs-kit@0.1.0-beta.1

## 6.0.0-beta.0

### Major Changes

- [#375](https://github.com/open-spaced-repetition/ts-fsrs/pull/375) [`17afe2a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/17afe2aaedc0467cc778b5fba9ea5e3d92834077) Thanks [@ishiko732](https://github.com/ishiko732)! - - feat: Add optional `desired_retention` to `FSRSAlgorithm.next_interval`.

  `next_interval(stability)` is now `next_interval(stability, desired_retention?)`. When omitted, `desired_retention` defaults to `parameters.request_retention`. The algorithm layer no longer clamps by `parameters.maximum_interval`; scheduler paths continue to read `request_retention` from parameters and apply maximum interval limits.

  - **BREAKING CHANGE:** The `interval_modifier` getter and `calculate_interval_modifier()` method have been removed.

- [#377](https://github.com/open-spaced-repetition/ts-fsrs/pull/377) [`21c86ff`](https://github.com/open-spaced-repetition/ts-fsrs/commit/21c86ffda267cbdf11b4fe80eccd1296d562cc87) Thanks [@ishiko732](https://github.com/ishiko732)! - **BREAKING CHANGE:** Move FSRS-6 algorithm operations out of the root `FSRSAlgorithm` API and into the model layer.

  - `FSRSAlgorithm` and the root-level algorithm helpers have been removed. Use the new `ts-fsrs/models/fsrs-6` entry for FSRS-6 model, algorithm, parameter migration, and clipping helpers.
  - `next_state`, `next_interval`, `forgetting_curve`, and `get_retrievability` have been removed from the `FSRS` facade/root exports. Use model methods (`step`, `nextInterval`, `forgettingCurve`, `forward`) or import `forgettingCurve` from `ts-fsrs/models/fsrs-6` instead.
  - `clipParameters` and `migrateParameters` have been removed from the root export. Use `clipFSRS6Parameters` and `migrateFSRS6Parameters` from `ts-fsrs/models/fsrs-6`.
  - `retrievability(card, now?)` now returns a number only. Format percentages at the call site when needed.
  - `IFSRS`, `FSRS`, and `fsrs()` are now deprecated and will be removed after the tests are migrated and passing. Use Scheduler going forward.

  Migration:

  ```ts
  // Before
  import { forgetting_curve, fsrs, migrateParameters } from "ts-fsrs";

  const f = fsrs();
  const state = f.next_state(memoryState, elapsedDays, rating);
  const interval = f.next_interval(state.stability);
  const retention = f.get_retrievability(card, now);
  const recall = f.forgetting_curve(elapsedDays, state.stability);
  const recallFromHelper = forgetting_curve(decay, elapsedDays, stability);
  const weights = migrateParameters(w);

  // After
  import { fsrs } from "ts-fsrs";
  import {
    forgettingCurve,
    migrateFSRS6Parameters,
  } from "ts-fsrs/models/fsrs-6";

  const f = fsrs();
  const state = f.model.step({ memoryState, elapsedDays, rating });
  const interval = f.model.nextInterval(state, f.parameters.request_retention);
  const retention = f.retrievability(card, now);
  const recall = f.model.forgettingCurve(state, elapsedDays);
  const recallFromHelper = forgettingCurve(decay, elapsedDays, stability);
  const weights = migrateFSRS6Parameters(w);
  ```

- [#409](https://github.com/open-spaced-repetition/ts-fsrs/pull/409) [`e376d55`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e376d558c118e4e5c6d1ccb695d87ba88e969602) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: add deterministic `cardId + reps` fuzzing middleware and a single flat `newCard({ now, ...fields })` input contract.

  `createSchedulerFuzzingMiddleware({ fuzzingRange, rng })` supports custom fuzz-range tables and seeded RNG implementations without adding functions to scheduler runtime config.

  The default seeded RNG now uses FNV-1a with Mulberry32 instead of Alea.

  Card initialization schemas now live at `schema.cardInitInput`; the composed schema parses the flat options into `{ input, now }`, and `defaultValue.card` receives the parsed card initialization input or forgotten card directly as `ctx.input`.

  Card initialization input types are carried separately from `SchedulerEnvFor` and `SchedulerCoreEnv`, keeping ordinary scheduler and core type displays compact.

  Legacy fuzzing now reuses the same core. The deprecated `DefaultInitSeedStrategy`, `GenSeedStrategyWithCardId`, `StrategyMode.SEED`, and `TSeedStrategy` APIs have been removed.

- [#407](https://github.com/open-spaced-repetition/ts-fsrs/pull/407) [`7162601`](https://github.com/open-spaced-repetition/ts-fsrs/commit/71626013513e6e16c7f7101eeae9c463e71ba5f4) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(fsrs): refactor learning steps and update its API.

- [#374](https://github.com/open-spaced-repetition/ts-fsrs/pull/374) [`e09aee2`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e09aee252f5fb55efaa3254ef4e6ffc5455b1a97) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - - **BREAKING CHANGE:** Removed `afterHandler` callback parameter from `createEmptyCard()`, `repeat()`, `next()`, `rollback()`, and `forget()` methods. Transform results externally after calling these methods instead.

  - **BREAKING CHANGE:** `reschedule` no longer accepts or applies `recordLogHandler`.

  Migration:

  ```ts
  // Before
  const card = createEmptyCard(now, cardAfterHandler);
  const result = f.repeat(card, now, repeatAfterHandler);
  const rescheduled = f.reschedule(card, reviews, { recordLogHandler: fn });

  // After
  const card = createEmptyCard(now);
  const result = repeatAfterHandler(f.repeat(card, now));
  const rescheduled = f.reschedule(card, reviews);
  // transform rescheduled.collections externally
  ```

- [#341](https://github.com/open-spaced-repetition/ts-fsrs/pull/341) [`620575b`](https://github.com/open-spaced-repetition/ts-fsrs/commit/620575bdeb1b252dfb39b75d051c0ee7275aea16) Thanks [@ishiko732](https://github.com/ishiko732)! - - **BREAKING CHANGE:** Removed global `Date.prototype` extensions (`scheduler`, `diff`, `format`, `dueFormat`). Use the standalone functions `date_scheduler()`, `date_diff()`, `formatDate()`, and `show_diff_message()` instead.

  - **BREAKING CHANGE:** Removed deprecated helper functions `fixDate()`, `fixState()`, and `fixRating()`. Use `TypeConvert.time()`, `TypeConvert.state()`, and `TypeConvert.rating()` instead.

- [#342](https://github.com/open-spaced-repetition/ts-fsrs/pull/342) [`dce1523`](https://github.com/open-spaced-repetition/ts-fsrs/commit/dce1523f1e319be35a92cd9116ca095d817da8d4) Thanks [@ishiko732](https://github.com/ishiko732)! - **BREAKING CHANGE:** Remove deprecated `elapsed_days` field from `Card` interface and `elapsed_days`/`last_elapsed_days` fields from `ReviewLog` interface.

  These fields were marked as deprecated since v5 and scheduled for removal in v6.0.0. When needed, `card.elapsed_days` can be derived from `card.last_review`.

  Migration: Remove any references to `card.elapsed_days`, `log.elapsed_days`, and `log.last_elapsed_days` from your code. If you still need an elapsed-days value, derive card values from `card.last_review` using `date_diff()`, and for review logs replace `log.elapsed_days` with `date_diff(log.review, log.due, 'days')`.

- [#356](https://github.com/open-spaced-repetition/ts-fsrs/pull/356) [`24b9f87`](https://github.com/open-spaced-repetition/ts-fsrs/commit/24b9f870daa884eb786bc63b9d2b4604373a7335) Thanks [@ishiko732](https://github.com/ishiko732)! - **BREAKING CHANGE:** Move fuzz handling out of `FSRSAlgorithm` into the scheduler/strategy layer.

  - `FSRSAlgorithm.apply_fuzz` and the `FSRSAlgorithm.seed` setter have been removed. The fuzz seed now lives internally on the scheduler instance (`AbstractScheduler#_seed`).
  - `FSRSAlgorithm.next_interval(s, elapsed_days)` is now `next_interval(s)` and returns the base interval (no fuzzing). Use the new `withFuzzing` helper if you need to apply fuzz manually; `repeat()` / `next()` still apply fuzz automatically through the scheduler.
  - Added `withFuzzing(interval, elapsedDays, config, seed?)` as the canonical camelCase entry point for fuzz application.

  Migration:

  ```ts
  // Before
  const interval = scheduler.next_interval(stability, elapsedDays);

  // After
  import { withFuzzing } from "ts-fsrs";
  const base = scheduler.next_interval(stability);
  const interval = withFuzzing(
    base,
    elapsedDays,
    {
      enableFuzz: scheduler.parameters.enable_fuzz,
      maximumInterval: scheduler.parameters.maximum_interval,
    },
    seed
  );
  ```

### Minor Changes

- [#401](https://github.com/open-spaced-repetition/ts-fsrs/pull/401) [`15d910d`](https://github.com/open-spaced-repetition/ts-fsrs/commit/15d910d24269676f740571dd53e958596aaa1e74) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(model): add `ts-fsrs/models/fsrs-3` as a dedicated FSRS-3 model entry.

- [#400](https://github.com/open-spaced-repetition/ts-fsrs/pull/400) [`4235e55`](https://github.com/open-spaced-repetition/ts-fsrs/commit/4235e558463ccdaa55b77563c95ace64f2d92e60) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(model): add FSRS-4 model support through the new `ts-fsrs/models/fsrs-4` entry.

- [#399](https://github.com/open-spaced-repetition/ts-fsrs/pull/399) [`8f7e9a0`](https://github.com/open-spaced-repetition/ts-fsrs/commit/8f7e9a02bb399799ad3e8d9c730632c8aa529133) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(model): add the `ts-fsrs/models/fsrs-4dot5` entrypoint with FSRS-4.5 model, algorithm, default weights, parameter helpers, and tests.

- [`06810cd`](https://github.com/open-spaced-repetition/ts-fsrs/commit/06810cd7ac27245a6fc58a95b177dfaa21054845) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): expose `defineScheduler`, `defineChrono`, and chrono presets

- [#378](https://github.com/open-spaced-repetition/ts-fsrs/pull/378) [`12d7154`](https://github.com/open-spaced-repetition/ts-fsrs/commit/12d7154f81ae0b1692bfc94de219dd66fcff1d65) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(model): add `ts-fsrs/models/fsrs-5` as a dedicated FSRS-5 model entry.

  The new entry exports the FSRS-5 algorithm, default weights, model binding, and parameter migration/clipping helpers based on the v4.7.1 implementation.

- [#398](https://github.com/open-spaced-repetition/ts-fsrs/pull/398) [`4b2501a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/4b2501a916d46c97f4351560af50f729a5b602ac) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): add model creation options for migration, parameter checking, and scheduler-side
  config reuse.

### Patch Changes

- [#412](https://github.com/open-spaced-repetition/ts-fsrs/pull/412) [`c3b5f87`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c3b5f8718a13d135ee46795cb7d4547a0b98f59e) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): add configurable leech suspension through scheduler middleware.

- [#346](https://github.com/open-spaced-repetition/ts-fsrs/pull/346) [`e3b6dff`](https://github.com/open-spaced-repetition/ts-fsrs/commit/e3b6dffeddcdfdb8fcd038f59e1af1d0b17aeaf1) Thanks [@ishiko732](https://github.com/ishiko732)! - Migrate build toolchain from Rollup + esbuild to tsdown (powered by Rolldown). Remove sourcemap generation and code minification. Remove unnecessary dependencies (rollup, @rollup/plugin-\*, rollup-plugin-esbuild, rollup-plugin-dts, tslib).

- [#411](https://github.com/open-spaced-repetition/ts-fsrs/pull/411) [`a95f12e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/a95f12e46a2d056482b15b5e364ca4b8c3f934e0) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): share monotonic interval scheduling and compose fuzzing and learning steps through scheduler middleware.

- [#415](https://github.com/open-spaced-repetition/ts-fsrs/pull/415) [`a9c0979`](https://github.com/open-spaced-repetition/ts-fsrs/commit/a9c0979cf5c0d01b81105cbbc6544df535348f66) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(middleware): optimize learning step scheduling.

- [#416](https://github.com/open-spaced-repetition/ts-fsrs/pull/416) [`218f653`](https://github.com/open-spaced-repetition/ts-fsrs/commit/218f6533daa4f814ef688a4f7feec8ce69787bce) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(middleware): optimize monotonic interval scheduling.

- [#414](https://github.com/open-spaced-repetition/ts-fsrs/pull/414) [`ef92894`](https://github.com/open-spaced-repetition/ts-fsrs/commit/ef928947369d9ec616be256561288b0491c9cea7) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(middleware): add scheduled days middleware.

- [#422](https://github.com/open-spaced-repetition/ts-fsrs/pull/422) [`f37e90a`](https://github.com/open-spaced-repetition/ts-fsrs/commit/f37e90acad8c1cf926e0459855af1977ab7fe2cc) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(model): add validation for FSRS-6 decay values.

- Updated dependencies [[`784cfdb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/784cfdbbee0e7bda5070bb3e3142c6ce14a3e7c3), [`784cfdb`](https://github.com/open-spaced-repetition/ts-fsrs/commit/784cfdbbee0e7bda5070bb3e3142c6ce14a3e7c3), [`85eeb71`](https://github.com/open-spaced-repetition/ts-fsrs/commit/85eeb7164779c1d6a21150e1962fe451c02748df)]:
  - @open-spaced-repetition/srs-kit@0.1.0-beta.0

## 5.4.1

### Patch Changes

- [#368](https://github.com/open-spaced-repetition/ts-fsrs/pull/368) [`c392245`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c3922456e07aac536570e5aeb3598f7090202c7d) Thanks [@cantalupo555](https://github.com/cantalupo555)! - fix(clipParameters): apply sqrt ceiling to w[17]/w[18] to prevent constraint violation during relearning

## 5.4.0

### Minor Changes

- [#365](https://github.com/open-spaced-repetition/ts-fsrs/pull/365) [`ab44ee9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/ab44ee97ca71828879b7998babb15bfa9b3aacf8) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(fsrs): Add `FSRSError` base classes and use `FSRSValidationError` for package validation errors.

### Patch Changes

- [#365](https://github.com/open-spaced-repetition/ts-fsrs/pull/365) [`ab44ee9`](https://github.com/open-spaced-repetition/ts-fsrs/commit/ab44ee97ca71828879b7998babb15bfa9b3aacf8) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(checkParameters): reject NaN parameter values during validation.

- [#357](https://github.com/open-spaced-repetition/ts-fsrs/pull/357) [`c0ffcce`](https://github.com/open-spaced-repetition/ts-fsrs/commit/c0ffccefd7824abe5a400c46eaa97a835efb86fa) Thanks [@ishiko732](https://github.com/ishiko732)! - refactor(fsrs): extract `applyAfterHandler` helper to deduplicate `afterHandler` plumbing in `repeat`, `next`, `rollback`, `forget`, and `reschedule`

## 5.3.3

### Patch Changes

- [#353](https://github.com/open-spaced-repetition/ts-fsrs/pull/353) [`fce96ee`](https://github.com/open-spaced-repetition/ts-fsrs/commit/fce96eeba51c84a82f00c827e6157333e0522985) Thanks [@ishiko732](https://github.com/ishiko732)! - fix(clipParameters): clamp w[11]/w[13]/w[14] before computing the w[17]/w[18] ceiling so that out-of-range inputs (e.g. 0 or negative values) no longer produce NaN/-Infinity via Math.log, and avoid invoking CLAMP_PARAMETERS twice by reusing the same clip ranges.

## 5.3.2

### Patch Changes

- [#329](https://github.com/open-spaced-repetition/ts-fsrs/pull/329) [`5cd8949`](https://github.com/open-spaced-repetition/ts-fsrs/commit/5cd8949544788224eada1b2e6f8597756ca594cb) Thanks [@ishiko732](https://github.com/ishiko732)! - fix: include README, localized package docs, and license files in the published `ts-fsrs` tarball

## 5.3.1

### Patch Changes

- [#315](https://github.com/open-spaced-repetition/ts-fsrs/pull/315) [`40e712e`](https://github.com/open-spaced-repetition/ts-fsrs/commit/40e712ebf229997154682294f40436bf1524022d) Thanks [@moaaz-ae](https://github.com/moaaz-ae)! - fix: prevent unexpected skipping of learning steps when Rating.Good is selected in State.Learning (#311)

## 5.3.0

### Minor Changes

- [#266](https://github.com/open-spaced-repetition/ts-fsrs/pull/266) [`17fb34d`](https://github.com/open-spaced-repetition/ts-fsrs/commit/17fb34d849c66f2035c5a239e2dfd64ed40055c9) Thanks [@ishiko732](https://github.com/ishiko732)! - Non-decreasing SInc(Hard) in same-day reviews — sync with fsrs-rs#376 changes

### Patch Changes

- [#314](https://github.com/open-spaced-repetition/ts-fsrs/pull/314) [`87f94f2`](https://github.com/open-spaced-repetition/ts-fsrs/commit/87f94f277f7030a449490cef943e1aebe1585b64) Thanks [@user1823](https://github.com/user1823)! - Performance improvements

> Older entries below were imported from GitHub Releases and preserve the original release-note wording where practical.

## 5.2.3

### Historical Release Notes

- Released: 2025-09-05
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.2.3)
- Permit mock date objects that convert to Date values by @runarberg in https://github.com/open-spaced-repetition/ts-fsrs/pull/215
- Bump the devdependencies group across 1 directory with 6 updates by @dependabot[bot] in https://github.com/open-spaced-repetition/ts-fsrs/pull/218

## 5.2.2

### Historical Release Notes

- Released: 2025-08-11
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.2.2)
- Convert jest config to typescript by @joshdavham in https://github.com/open-spaced-repetition/ts-fsrs/pull/211
- Bump @biomejs/biome from 2.0.6 to 2.1.3 in the devdependencies group across 1 directory by @dependabot[bot] in https://github.com/open-spaced-repetition/ts-fsrs/pull/212
- Fix/clamp the minimum of `w[19]` by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/213

## 5.2.1

### Historical Release Notes

- Released: 2025-07-14
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.2.1)
- Fix/Ignore deprecated code for code coverage by @Luc-Mcgrady in https://github.com/open-spaced-repetition/ts-fsrs/pull/199
- Bump the devdependencies group with 11 updates by @dependabot[bot] in https://github.com/open-spaced-repetition/ts-fsrs/pull/198
- Style/migrate to biome.js by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/201
- Bump the devdependencies group with 4 updates by @dependabot[bot] in https://github.com/open-spaced-repetition/ts-fsrs/pull/202
- Update README syntax and enhance documentation by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/205
- Fix: Prevent premature graduation for cards in learning state by @tomerbeil in https://github.com/open-spaced-repetition/ts-fsrs/pull/206
- Fix publish.yml by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/207

## 5.2.0

### Historical Release Notes

- Released: 2025-06-15
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.2.0)
- Fix/FSRS-6 default parameters by @xiety in https://github.com/open-spaced-repetition/ts-fsrs/pull/196

## 5.1.0

### Historical Release Notes

- Released: 2025-06-10
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.1.0)
- Chore/mark fields and methods as depreacted by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/192
- Bump the devdependencies group with 6 updates by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/184
- Improved Typing for FSRS Class Methods by @nodbew in https://github.com/open-spaced-repetition/ts-fsrs/pull/195

## 5.0.1

### Historical Release Notes

- Released: 2025-06-03
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.0.1)
- Fix/fix path in jsr & update README badge by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/183
- Docs/update badges by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/186
- Test/fix `memory state` unit test by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/187
- Fix/add missing fields to package.json for compatibility by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/191

## 5.0.0

### Historical Release Notes

- Released: 2025-05-12
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.0.0)
- 1. Upgraded to FSRS-6 algorithm
- 2. New learning_steps field added to card and revlog
- 3. Added new (re)learning_steps fields to FSRSParameters
- Feat/FSRS-6 by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/174
- Chore/update release process by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/178
- Bump the devdependencies group across 1 directory with 9 updates by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/176
- publish to JSR by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/180
- Feat/(re)learning steps by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/177
- Chore/upgrade typedocs&ESM by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/170
- Feat/checkParameters by @Luc-Mcgrady in https://github.com/open-spaced-repetition/ts-fsrs/pull/182
- Docs/Readme by @Luc-Mcgrady in https://github.com/open-spaced-repetition/ts-fsrs/pull/179
- Export types and release 5.0.0 by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/181

## 4.7.1

### Historical Release Notes

- Released: 2025-04-07
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.7.1)
- Doc/Improve Examples by @david-allison in https://github.com/open-spaced-repetition/ts-fsrs/pull/163
- Bump the devdependencies group across 1 directory with 8 updates by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/164
- Fix/prevent overwriting default values and parameters by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/165

## 4.7.0

### Historical Release Notes

- Released: 2025-03-15
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.7.0)
- add nix && update some api by @asukaminato0721 in https://github.com/open-spaced-repetition/ts-fsrs/pull/149
- Create dependabot.yml by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/153
- Fix/incorrect eslint config by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/152
- Bump the devdependencies group across 1 directory with 13 updates by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/157
- Bump the devdependencies group with 6 updates by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/158
- Fix/Add Prettier to ci by @Luc-Mcgrady in https://github.com/open-spaced-repetition/ts-fsrs/pull/160
- Feat/Export the forgetting curve function by @Luc-Mcgrady in https://github.com/open-spaced-repetition/ts-fsrs/pull/159

## 4.6.1

### Historical Release Notes

- Released: 2025-01-22
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.6.1)
- Chore/Optimize the build by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/147
- Fix/clamp the `params` and `s` by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/148

## 4.6.0

### Historical Release Notes

- Released: 2025-01-06
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.6.0)
- Feat/add `next_state` method by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/146

## 4.5.2

### Historical Release Notes

- Released: 2025-01-05
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.5.2)
- Fix/wrong calc elapsed days by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/144

## 4.5.1

### Historical Release Notes

- Released: 2024-12-17
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.5.1)
- Fix/clip post lapse stability by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/142

## 4.5.0

### Historical Release Notes

- Released: 2024-11-30
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.5.0)
- nolyfill by @asukaminato0721 in https://github.com/open-spaced-repetition/ts-fsrs/pull/138
- Bump cross-spawn from 7.0.3 to 7.0.6 by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/139
- Feat/Impl `initSeed`& `Scheduler` extension based on the strategy pattern by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/137
- Feat/linear damping by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/133

## 4.4.3

### Historical Release Notes

- Released: 2024-11-09
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.4.3)
- Fix/export the `FSRSHistory` and `FSRSReview` typo by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/135

## 4.4.2

### Historical Release Notes

- Released: 2024-10-21
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.4.2)
- Fix/update FSRS-4.5 params into FSRS-5 properly by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/132

## 4.4.1

### Historical Release Notes

- Released: 2024-10-11
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.4.1)
- Test/update `alea` test by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/128
- Refactor/reschedule by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/127
- Bump micromatch from 4.0.5 to 4.0.8 by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/129
- Bump rollup from 4.18.1 to 4.22.4 by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/130

## 4.3.1

### Historical Release Notes

- Released: 2024-09-19
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.3.1)
- Fix/typo: schduler -> scheduler by @L-M-Sherlock in https://github.com/open-spaced-repetition/ts-fsrs/pull/123
- Fix/stability not restrict maximun and minimun by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/126

## 4.3.0

### Historical Release Notes

- Released: 2024-09-12
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.3.0)
- compute retrievability for all states by @L-M-Sherlock in https://github.com/open-spaced-repetition/ts-fsrs/pull/122

## 4.2.0

### Historical Release Notes

- Released: 2024-09-07
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.2.0)
- Feat/Support iteration in the `repeat` by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/121

## 4.1.3

### Historical Release Notes

- Released: 2024-09-01
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.1.3)
- Chore/clear seedrandom by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/116
- Add unit test of memory state by @L-M-Sherlock in https://github.com/open-spaced-repetition/ts-fsrs/pull/119
- Fix/spelling error default by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/120

## 4.1.2

### Historical Release Notes

- Released: 2024-08-15
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.1.2)
- Example/add switch short-term example by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/111
- Fix/set same seed should return the same interval by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/114

## 4.1.1

### Historical Release Notes

- Released: 2024-08-04
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.1.1)
- Fix/default return typo for next method by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/109
- Fix/if s<0.5, get_retrievability return NaN by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/110

## 4.1.0

### Historical Release Notes

- Released: 2024-08-03
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.1.0)
- upgrade typescript-eslint to version 8 by @joshdavham in https://github.com/open-spaced-repetition/ts-fsrs/pull/107
- Feat/remove seedrandom & use alea prng by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/108

## 4.0.2

### Historical Release Notes

- Released: 2024-07-30
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.0.2)
- Fix/long term scheduler has not been set correctly for s and d by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/106

## 4.0.1

### Historical Release Notes

- Released: 2024-07-27
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.0.1)
- Fix/set mean reversion target to d0(4) by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/103
- Feat/use `Reflect` to set the `FSRSParamters` by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/104

## 4.0.0

### Historical Release Notes

- Released: 2024-07-25
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.0.0)
- Fix/deploy not working by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/97
- Refactor/Scheduler Framework by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/99
- Feat/add the next method to return card and log results by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/101
- Chore/add debugging folder by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/102
- Feat/long-term schduler by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/100

## 4.0.0-beta

### Historical Release Notes

- Released: 2024-07-14
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v4.0.0-beta)
- Starting with `ts-fsrs@4.x`, the minimum required Node.js version is 18.0.0. FSRS-5 is still in alpha stage, install using `ts-fsrs@beta`:
- Introducing an automated fill for seamless migration from `>= ts-fsrs@3.5.3` to `ts-fsrs@4.0.0-beta`.
- Doc/add spaced app as a reference by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/87
- Example/update use ts-fsrs in CDN example by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/88
- Chore/update CI/CD by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/89
- Bump braces from 3.0.2 to 3.0.3 by @dependabot in https://github.com/open-spaced-repetition/ts-fsrs/pull/90
- Example/add popup message by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/92
- format code by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/94
- Doc/add ts fsrs workflow by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/96
- Feat/bump nodejs to 18 by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/93
- Feat/FSRS V5 by @ishiko732 in https://github.com/open-spaced-repetition/ts-fsrs/pull/95

## 3.5.7

### Historical Release Notes

- Released: 2024-04-18
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.7)
- pref/adjusting get_retrievability by @ishiko732 in #83

## 3.5.6

### Historical Release Notes

- Released: 2024-04-16
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.6)
- Chore/config typedoc by @ishiko732 in #82
- Feat/Add umd distribution by @barrelltech in #84
- Fix/actions is not functioning correctly by @ishiko732 in #86

## 3.5.5

### Historical Release Notes

- Released: 2024-04-16
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.5)
- Chore/config typedoc by @ishiko732 in #82
- Feat/Add umd distribution by @barrelltech in #84
- Due to the incorrect GitHub Actions setup, the v3.5.5 release needs to be revoked, and the changes will be merged into v3.5.6.

## 3.5.4

### Historical Release Notes

- Released: 2024-04-11
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.4)
- Feat/allow parameters to be modified by @ishiko732 in #81

## 3.5.3

### Historical Release Notes

- Released: 2024-03-21
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.3)
- Fix/input not array in reschedule method by @ishiko732 in #77

## 3.5.2

### Historical Release Notes

- Released: 2024-03-15
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.2)
- Test/update algorithm test by @ishiko732 in #75
- Fix/IEEE754 decimal precision by @ishiko732 in #76

## 3.5.1

### Historical Release Notes

- Released: 2024-03-13
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.1)
- Fix/fuzz=false wrong calc next_ivl by @ishiko732 in #74

## 3.5.0

### Historical Release Notes

- Released: 2024-03-12
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.5.0)
- Fix/Grades allowed be modified by @ishiko732 in #73
- Feat/reschedule&update fuzz by @ishiko732 in #72

## 3.4.1

### Historical Release Notes

- Released: 2024-03-02
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.4.1)
- Chore/update default parameters by @ishiko732 in #71

## 3.4.0

### Historical Release Notes

- Released: 2024-02-09
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.4.0)
- Feat/add after handler by @ishiko732 in #69
- Refactor/pre-processing input by @ishiko732 in #69
- Doc/add example annotation by @ishiko732 in #69
- Test/add test afterHandler by @ishiko732 in #69
- With the use of the afterHandler, you can easily implement data transformation, making it convenient to integrate with ORM frameworks.
- Examples have been added to the comments, and detailed information can be viewed through the [documentation](https://open-spaced-repetition.github.io/ts-fsrs/) or IDE (Visual Studio Code/WebStorm).

## 3.3.1

### Historical Release Notes

- Released: 2024-02-05
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.3.1)
- docs/change of License by @ishiko732 in #66
- Chore/remove rollup-plugin-terser by @ishiko732 in #67
- Fix/date is not a function by @ishiko732 in #68

## 3.3.0

### Historical Release Notes

- Released: 2023-12-26
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.3.0)
- Feat/fsrs-4.5 by @ishiko732 in #65

## 3.2.3

### Historical Release Notes

- Released: 2023-12-24
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.2.3)
- Chore/support commonjs by @ishiko732 in #63 for #62

## 3.2.2

### Historical Release Notes

- Released: 2023-12-15
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.2.2)
- Chore/bump package.json by @ishiko732 in #61

## 3.2.1

### Historical Release Notes

- Released: 2023-12-10
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.2.1)
- Feat/calc s inc based on last_d by @ishiko732 in #59
- Fix/wrong typo RatingType by @ishiko732 in #60
- Chore/readme by @ishiko732 in #60

## 3.1.1

### Historical Release Notes

- Released: 2023-11-20
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.1.1)
- Feat/rollback Card by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/40
- Feat/forget by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/42
- Fix/The calculated result of elapsed_days is incorrect in the revlog by @ishiko732 in https://github.com/ishiko732/ts-fsrs/issues/44
- Fix/Circular Dependencies by @ishiko732
- Chore/ compilation using Rollup by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/46
- Chore/ delete fsrs.umd.js by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/47
- Chore/ exports sourcemap by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/48
- Refactor/Remove dotenv file and reduce repository size by 138KB by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/49
- Fix/wrong scheduled_days in forget by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/50
- Chore/example by @ishiko732 in https://github.com/ishiko732/ts-fsrs/pull/51
- Fix/GitHub actions by @ishiko732 in #53 #54

## 3.0.6

### Historical Release Notes

- Released: 2023-11-04
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.0.6)
- readme add basic use; add annoation to some function ; add digrams write by plantuml by @2Lavine in #38
- Doc/add return type in algorithm.ts&update example in README.md by @ishiko732 in #41
- Feat/grades by @ishiko732 in #43

## 3.0.4

### Historical Release Notes

- Released: 2023-10-22
- Source: [GitHub Release](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v3.0.4)
- Feat/env in #30
- Feat/fsrs v4 #31
- Fix/wrong data types #33
- Feat/never type #34
- Feat/recordLog type #36
- security:Bump @babel/traverse from 7.22.19 to 7.23.2 by bot in #35
