---
"@open-spaced-repetition/srs-kit": minor
---

feat(kit): add `check` option to scheduler `create` to skip redundant output re-validation. Input validation is always applied, and card and revlog model memory state are still re-parsed (rollback snapshots come from the final rolled-back card); chrono, core, and middleware fields written by the pipeline are trusted as-is.
