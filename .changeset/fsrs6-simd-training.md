---
"@open-spaced-repetition/binding": patch
---

perf: update fsrs-rs for 5–6× faster FSRS-6 `computeParameters` (SIMD training kernel). Items without reviews now reject with `InvalidInput` instead of panicking.
