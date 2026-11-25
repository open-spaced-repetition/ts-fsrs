---
'@open-spaced-repetition/binding': patch
---

fix: round fractional `daysElapsed` to whole days for FSRS-6 in `FSRSBinding.nextStates`, matching `fsrs-rs` behavior.
