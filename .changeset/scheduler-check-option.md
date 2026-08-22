---
"@open-spaced-repetition/srs-kit": minor
---

feat(kit): add `check` option to scheduler `create` to skip redundant output re-validation. Input validation is always applied and model memory state is still re-parsed; chrono, core, and middleware fields written by the pipeline are trusted as-is.
