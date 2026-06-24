---
"@open-spaced-repetition/srs-kit": minor
---

feat: add SRS framework primitives, schema helpers, and model contracts

Model definitions validate their own config in `create()` and return the
validated config on the runtime for scheduler defaults.
