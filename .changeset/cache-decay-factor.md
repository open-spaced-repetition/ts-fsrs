---
"ts-fsrs": patch
---

perf: cache decay/factor in FSRSAlgorithm to avoid redundant computation in forgetting_curve

- Replace bound `forgetting_curve` function with an instance method that uses cached `decay`/`factor` values
- Cache is updated automatically when `w` parameters change via proxy handler
- Add benchmark suite for `next_state` and `forgetting_curve` in `packages/fsrs/bench/`
- Add `forgetting_curve.test.ts` covering cache consistency, concurrent mutations, and multi-instance independence
