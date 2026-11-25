---
'@open-spaced-repetition/binding': patch
---

fix: validate `desiredRetention` is finite and in `(0, 1)` across `FSRSBinding.nextStates` and `computeOptimalSteps`.
