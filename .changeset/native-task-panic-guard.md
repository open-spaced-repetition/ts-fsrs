---
"@open-spaced-repetition/binding": patch
---

fix: reject the Promise instead of aborting the Node.js process when `computeParameters` or `evaluateWithTimeSeriesSplits` panics in a native binding, and stop the progress poller.
