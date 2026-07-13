---
"ts-fsrs": major
---

**BREAKING CHANGE:** Move fuzz handling out of `FSRSAlgorithm` into the scheduler/strategy layer.

- `FSRSAlgorithm.apply_fuzz` and the `FSRSAlgorithm.seed` setter have been removed. The fuzz seed now lives internally on the scheduler instance (`AbstractScheduler#_seed`).
- `FSRSAlgorithm.next_interval(s, elapsed_days)` is now `next_interval(s)` and returns the base interval (no fuzzing). Use the new `withFuzzing` helper if you need to apply fuzz manually; `repeat()` / `next()` still apply fuzz automatically through the scheduler.
- Added `withFuzzing(interval, elapsedDays, config, seed?)` as the canonical camelCase entry point for fuzz application.

Migration:

```ts
// Before
const interval = scheduler.next_interval(stability, elapsedDays)

// After
import { withFuzzing } from 'ts-fsrs'
const base = scheduler.next_interval(stability)
const interval = withFuzzing(
  base,
  elapsedDays,
  {
    enableFuzz: scheduler.parameters.enable_fuzz,
    maximumInterval: scheduler.parameters.maximum_interval,
  },
  seed
)
```
