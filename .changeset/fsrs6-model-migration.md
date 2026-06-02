---
"ts-fsrs": major
---

**BREAKING CHANGE:** Move FSRS-6 algorithm operations out of the root `FSRSAlgorithm` API and into the model layer.

- `FSRSAlgorithm` and the root-level algorithm helpers have been removed. Use the new `ts-fsrs/models/fsrs-6` entry for FSRS-6 model, algorithm, parameter migration, and clipping helpers.
- `next_state`, `next_interval`, `forgetting_curve`, and `get_retrievability` have been removed from the `FSRS` facade/root exports. Use model methods (`step`, `nextInterval`, `forgettingCurve`, `forward`) or import `forgettingCurve` from `ts-fsrs/models/fsrs-6` instead.
- `clipParameters` and `migrateParameters` have been removed from the root export. Use `clipFSRS6Parameters` and `migrateFSRS6Parameters` from `ts-fsrs/models/fsrs-6`.
- `retrievability(card, now?)` now returns a number only. Format percentages at the call site when needed.
- `IFSRS`, `FSRS`, and `fsrs()` are now deprecated and will be removed after the tests are migrated and passing. Use Scheduler going forward.

Migration:

```ts
// Before
import { forgetting_curve, fsrs, migrateParameters } from 'ts-fsrs'

const f = fsrs()
const state = f.next_state(memoryState, elapsedDays, rating)
const interval = f.next_interval(state.stability)
const retention = f.get_retrievability(card, now)
const recall = f.forgetting_curve(elapsedDays, state.stability)
const recallFromHelper = forgetting_curve(decay, elapsedDays, stability)
const weights = migrateParameters(w)

// After
import { fsrs } from 'ts-fsrs'
import {
  forgettingCurve,
  migrateFSRS6Parameters,
} from 'ts-fsrs/models/fsrs-6'

const f = fsrs()
const state = f.model.step({ memoryState, elapsedDays, rating })
const interval = f.model.nextInterval(state, f.parameters.request_retention)
const retention = f.retrievability(card, now)
const recall = f.model.forgettingCurve(state, elapsedDays)
const recallFromHelper = forgettingCurve(
  decay,
  elapsedDays,
  stability
)
const weights = migrateFSRS6Parameters(w)
```
