---
'ts-fsrs': patch
---

fix(clipParameters): clamp w[11]/w[13]/w[14] before computing the w[17]/w[18] ceiling so that out-of-range inputs (e.g. 0 or negative values) no longer produce NaN/-Infinity via Math.log, and avoid invoking CLAMP_PARAMETERS twice by reusing the same clip ranges.
