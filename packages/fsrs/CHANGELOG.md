# ts-fsrs

## 6.0.0

This is a major update with breaking changes. ts-fsrs v6 introduces FSRS-7, the default model for `DefaultScheduler`; see the [quick start](https://open-spaced-repetition.github.io/ts-fsrs/guide/quick-start#start-with-defaultscheduler) to get started. For existing integrations, we recommend following the [migration guide](https://open-spaced-repetition.github.io/ts-fsrs/guide/migration) and using [llms.txt](https://open-spaced-repetition.github.io/ts-fsrs/llms.txt) as the documentation entry point for AI-assisted migration.

### Breaking Changes

- Move algorithm operations to explicit model entries. Import models and parameter helpers from `ts-fsrs/models/fsrs-3`, `fsrs-4`, `fsrs-4dot5`, `fsrs-5`, `fsrs-6`, or `fsrs-7`. The root `FSRSAlgorithm`, `computeDecayFactor`, `clipParameters`, `migrateParameters`, and `forgetting_curve` exports and the legacy facade's `next_state`, `next_interval`, and `get_retrievability` methods are removed. The inherited algorithm API, including `interval_modifier`, `calculate_interval_modifier`, `apply_fuzz`, and the `seed` setter, is no longer available on `FSRS`. Use model `step`, `nextInterval`, `forgettingCurve`, and `forward`; `retrievability` returns a number, so format percentages at the call site. `FSRS`, `IFSRS`, and `fsrs()` remain exported but deprecated and use FSRS-6. ([#377](https://github.com/open-spaced-repetition/ts-fsrs/pull/377), [#375](https://github.com/open-spaced-repetition/ts-fsrs/pull/375), [#356](https://github.com/open-spaced-repetition/ts-fsrs/pull/356)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Remove `afterHandler` callbacks from `createEmptyCard`, `repeat`, `next`, `rollback`, and `forget`, and remove `recordLogHandler` from legacy `reschedule`. Transform returned results at the call site. ([#374](https://github.com/open-spaced-repetition/ts-fsrs/pull/374)) Thanks [@ishiko732](https://github.com/ishiko732) and [@Copilot](https://github.com/Copilot)!
- Remove global `Date.prototype` extensions and deprecated `fixDate`, `fixState`, and `fixRating` helpers. Use standalone date helpers and `TypeConvert.time/state/rating` for legacy integrations. Remove `Card.elapsed_days` and `ReviewLog.elapsed_days/last_elapsed_days`; derive elapsed time from actual review timestamps, not the scheduled due date. ([#341](https://github.com/open-spaced-repetition/ts-fsrs/pull/341), [#342](https://github.com/open-spaced-repetition/ts-fsrs/pull/342)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Replace Alea with FNV-1a and Mulberry32, changing fuzzed interval sequences. The new scheduler seeds fuzzing with `cardId + reps`; the legacy scheduler still derives its seed from review time, repetition count, difficulty, and stability. Remove `DefaultInitSeedStrategy`, `GenSeedStrategyWithCardId`, `StrategyMode.SEED`, and `TSeedStrategy`. Use `schedulerFuzzingMiddleware` or `createSchedulerFuzzingMiddleware({ fuzzingRange, rng })`. ([#409](https://github.com/open-spaced-repetition/ts-fsrs/pull/409)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Require Node.js 24 or later. ([#406](https://github.com/open-spaced-repetition/ts-fsrs/pull/406)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Replace `BasicLearningStepsStrategy` with `calculateLearningSteps` and `TLearningStepsStrategy` with `LearningStepsResolver`. Custom `StrategyMode.LEARNING_STEPS` handlers now receive camelCase `learningSteps`/`relearningSteps` config and return `scheduledMinutes`/`nextStep` instead of `scheduled_minutes`/`next_step`. Replace `default_learning_steps` and `default_relearning_steps` imports with `defaultLearningSteps` and `defaultRelearningSteps`. ([#407](https://github.com/open-spaced-repetition/ts-fsrs/pull/407)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Replace the numeric TypeScript enums `Rating` and `State` with frozen constant objects and numeric union types. Numeric values remain unchanged, but reverse lookups such as `Rating[3]` and `State[2]` no longer work; replace enum-member type annotations such as `Rating.Good` with `typeof Rating.Good`. ([#457](https://github.com/open-spaced-repetition/ts-fsrs/pull/457)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Rename `FSRSReview.delta_t` to `deltaT` and narrow its `rating` to `Grade` (Again through Easy, excluding Manual). Custom legacy schedulers now receive `(card, now, model, parameters, strategies)` instead of `(card, now, algorithm, strategies)`; subclasses must use the model and separate parameters rather than `this.algorithm`. ([#377](https://github.com/open-spaced-repetition/ts-fsrs/pull/377)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Change declaration files from `dist/index.d.ts` to format-specific `.d.mts`/`.d.cts` files and remove the `umd` package-export condition. Use package imports for declaration resolution and update tooling that hard-codes the old declaration path; the UMD bundle is still built. ([#346](https://github.com/open-spaced-repetition/ts-fsrs/pull/346)) Thanks [@ishiko732](https://github.com/ishiko732)!

### New Features

- Add the asynchronous `DefaultScheduler(options)` factory backed by `@open-spaced-repetition/srs-kit`. It defaults to FSRS-7; select `version: 'FSRS-6'` to retain the previous model. The new API uses `newCard`, `preview`, `review`, `rollback`, `forget`, `retrievability`, and `nextInterval`, with camelCase card/config fields and `{ card, revlog }` review results. ([#451](https://github.com/open-spaced-repetition/ts-fsrs/pull/451), [#531](https://github.com/open-spaced-repetition/ts-fsrs/pull/531), [#526](https://github.com/open-spaced-repetition/ts-fsrs/pull/526)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Add FSRS-3, FSRS-4, FSRS-4.5, FSRS-5, and FSRS-7 model entries alongside FSRS-6. FSRS-7 uses 34 weights, a `stabilityFast` memory field, and fractional-day intervals. Its standalone `curve` returns retrievability and total mixture weight; parameter bounds are also exported. ([#401](https://github.com/open-spaced-repetition/ts-fsrs/pull/401), [#400](https://github.com/open-spaced-repetition/ts-fsrs/pull/400), [#399](https://github.com/open-spaced-repetition/ts-fsrs/pull/399), [#378](https://github.com/open-spaced-repetition/ts-fsrs/pull/378), [#520](https://github.com/open-spaced-repetition/ts-fsrs/pull/520), [#541](https://github.com/open-spaced-repetition/ts-fsrs/pull/541), [#556](https://github.com/open-spaced-repetition/ts-fsrs/pull/556)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Expose `defineModel`, `defineScheduler`, `defineChrono`, `defineMiddleware`, chrono presets, scheduling schemas, and srs-kit types for custom integrations. Built-in middleware is available from the root and `ts-fsrs/middlewares`, including desired retention, fuzzing, statistics, scheduled days, learning steps, maximum/monotonic intervals, leech suspension, and Cost ADR. Leech suspension uses `scheduleStatus: 'suspended'`; Cost ADR and leech middleware are opt-in. ([#445](https://github.com/open-spaced-repetition/ts-fsrs/pull/445), [#469](https://github.com/open-spaced-repetition/ts-fsrs/pull/469), [#509](https://github.com/open-spaced-repetition/ts-fsrs/pull/509), [#539](https://github.com/open-spaced-repetition/ts-fsrs/pull/539), [#412](https://github.com/open-spaced-repetition/ts-fsrs/pull/412), [#461](https://github.com/open-spaced-repetition/ts-fsrs/pull/461), [#528](https://github.com/open-spaced-repetition/ts-fsrs/pull/528)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Support per-grade desired retention and direct `nextInterval` queries through interval middleware. Add `graduatingInterval` and `allowModelOverride` to learning-step scheduling. `DefaultScheduler` defaults to learning steps `['1m', '10m']`, relearning steps `['10m']`, and model override enabled only for FSRS-7. Disabling explicit learning steps does not disable FSRS-7's intrinsic fast trace. ([#527](https://github.com/open-spaced-repetition/ts-fsrs/pull/527), [#526](https://github.com/open-spaced-repetition/ts-fsrs/pull/526), [#561](https://github.com/open-spaced-repetition/ts-fsrs/pull/561)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Add `Reschedule` at `ts-fsrs/reschedule` for replaying review history into memory states or rescheduling cards and review logs. ([#426](https://github.com/open-spaced-repetition/ts-fsrs/pull/426), [#439](https://github.com/open-spaced-repetition/ts-fsrs/pull/439)) Thanks [@ishiko732](https://github.com/ishiko732) and [@Eijnewgnaw](https://github.com/Eijnewgnaw)!
- Separate parameter migration, clipping, and validation, and accept readonly parameter arrays. ([#398](https://github.com/open-spaced-repetition/ts-fsrs/pull/398), [#492](https://github.com/open-spaced-repetition/ts-fsrs/pull/492), [#515](https://github.com/open-spaced-repetition/ts-fsrs/pull/515)) Thanks [@ishiko732](https://github.com/ishiko732) and [@Luc-Mcgrady](https://github.com/Luc-Mcgrady)!

### Fixes

- Enforce maximum intervals independently of fuzzing, preserve explicit learning steps and second precision, and keep graduation intervals monotonic. Correct FSRS-7 sub-day scheduling states. ([#454](https://github.com/open-spaced-repetition/ts-fsrs/pull/454), [#456](https://github.com/open-spaced-repetition/ts-fsrs/pull/456), [#484](https://github.com/open-spaced-repetition/ts-fsrs/pull/484), [#540](https://github.com/open-spaced-repetition/ts-fsrs/pull/540)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Clamp FSRS-4.5 through FSRS-6 initial stability to configured bounds, and validate numeric bounds and learning-step inputs. ([#477](https://github.com/open-spaced-repetition/ts-fsrs/pull/477), [#549](https://github.com/open-spaced-repetition/ts-fsrs/pull/549)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Preserve pre-review chronology during rollback, improve inferred card/revlog type displays, and avoid redundant interval calculations. ([#522](https://github.com/open-spaced-repetition/ts-fsrs/pull/522), [#473](https://github.com/open-spaced-repetition/ts-fsrs/pull/473), [#443](https://github.com/open-spaced-repetition/ts-fsrs/pull/443)) Thanks [@ishiko732](https://github.com/ishiko732)!

### Build and Tooling

- Replace Rollup/esbuild with tsdown (Rolldown), and stop emitting source maps and minified bundles. ([#346](https://github.com/open-spaced-repetition/ts-fsrs/pull/346)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Add the build-time `TS_FSRS_DISABLE_ROUNDING` switch for custom builds. Published builds keep rounding enabled; this is not a runtime environment setting. ([#547](https://github.com/open-spaced-repetition/ts-fsrs/pull/547)) Thanks [@ishiko732](https://github.com/ishiko732)!
- Migrate the repository's root TypeScript toolchain to TypeScript 7 (tsgo). `srs-kit` retains its package-local TypeScript 6 development dependency. This is a development-toolchain change, not a new TypeScript 7 requirement for consumers. ([#403](https://github.com/open-spaced-repetition/ts-fsrs/pull/403)) Thanks [@zi-gae](https://github.com/zi-gae)!

### Migration

Upgrading the package and upgrading the model are separate operations. Keep FSRS-6 explicitly when migrating an existing FSRS-6 integration. To move learned cards to FSRS-7, use FSRS-7 weights and rebuild memory from complete review history since creation or the latest memory reset; do not reuse FSRS-6 weights or invent `stabilityFast`. Select the post-reset history explicitly: `replay()` filters Manual records but does not interpret reset events. Use `Reschedule.replay()` to rebuild memory while preserving existing due dates, learning progress, counters, and historical logs; `reschedule()` instead replays scheduling policy and can change the schedule. The new scheduler's `forget` clears statistics by default; set `clearStatsOnForget: false` when those statistics must be retained.

When adopting the new scheduler, migrate `due`/`last_review` to `dueAt`/`lastReviewAt`, `learning_steps` to `learningStep`, and `{ card, log }` to `{ card, revlog }`; persist `scheduleStatus` and retain a stable `cardId`. Date-based inputs require valid `Date` objects after deserialization. Review logs distinguish the pre-review `lastReviewAt`, pre-review `dueAt`, and actual `reviewTime`; do not blindly rename old `log.due` or use old-model logs for FSRS-7 rollback. Learned cards without complete history must remain on FSRS-6 rather than receiving an invented FSRS-7 state.

See the [v6 and FSRS-7 migration guide](https://open-spaced-repetition.github.io/ts-fsrs/guide/migration) for card/config mappings and rollback timestamp requirements. ([#543](https://github.com/open-spaced-repetition/ts-fsrs/pull/543)) Thanks [@ishiko732](https://github.com/ishiko732)!

## 5.4.2

### Patch Changes

- [#486](https://github.com/open-spaced-repetition/ts-fsrs/pull/486) [`13f9233`](https://github.com/open-spaced-repetition/ts-fsrs/commit/13f9233edfbcf8d2f55e8683130bc186dcc539d7) Thanks [@gpanakkal](https://github.com/gpanakkal)! - fix(fsrs): clip parameters after migrating

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
