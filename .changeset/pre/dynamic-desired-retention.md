---
"ts-fsrs": major
---

- feat: Add optional `desired_retention` to `FSRSAlgorithm.next_interval`.

`next_interval(stability)` is now `next_interval(stability, desired_retention?)`. When omitted, `desired_retention` defaults to `parameters.request_retention`. The algorithm layer no longer clamps by `parameters.maximum_interval`; scheduler paths continue to read `request_retention` from parameters and apply maximum interval limits.

- **BREAKING CHANGE:** The `interval_modifier` getter and `calculate_interval_modifier()` method have been removed.
