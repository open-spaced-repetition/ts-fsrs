---
"ts-fsrs": major
---

feat: add deterministic `cardId + reps` fuzzing middleware and a single flat `newCard({ now, ...fields })` input contract.

`createSchedulerFuzzingMiddleware({ fuzzingRange, rng })` supports custom fuzz-range tables and seeded RNG implementations without adding functions to scheduler runtime config.

The default seeded RNG now uses FNV-1a with Mulberry32 instead of Alea.

Card initialization schemas now live at `schema.cardInitInput`; the composed schema parses the flat options into `{ input, now }`, and `defaultValue.card` receives the parsed card initialization input or forgotten card directly as `ctx.input`.

Card initialization input types are carried separately from `SchedulerEnvFor` and `SchedulerCoreEnv`, keeping ordinary scheduler and core type displays compact.

Legacy fuzzing now reuses the same core. The deprecated `DefaultInitSeedStrategy`, `GenSeedStrategyWithCardId`, `StrategyMode.SEED`, and `TSeedStrategy` APIs have been removed.
