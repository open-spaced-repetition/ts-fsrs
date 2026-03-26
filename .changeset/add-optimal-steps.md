---
"@open-spaced-repetition/binding": minor
---

feat(binding): add `computeOptimalSteps` to analyze revlog and recommend optimal learning/relearning steps

Compute optimal learning/relearning steps from CSV revlog data.
Analyzes review history by rating groups, fits forgetting curves via golden-section search,
and recommends step durations based on desired retention and decay parameters.
