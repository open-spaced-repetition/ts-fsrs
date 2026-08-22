---
"ts-fsrs": patch
---

fix(fsrs): harden learning-steps schedule memoization.

- Memo entries pin the exact step arrays they were computed from, so
  replacing `config.learningSteps` with a different array rebuilds the
  entry instead of serving stale schedules.
- Out-of-bounds learningStep bypasses the memo with a state-aware bound
  (Learning uses learningSteps, Relearning/Review use relearningSteps).
- `getScheduledMinutes` fast-paths integer minutes (identical values for
  every non-decimal step unit).
