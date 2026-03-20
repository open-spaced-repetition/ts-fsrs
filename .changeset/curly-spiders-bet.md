---
"@open-spaced-repetition/binding": patch
---

fix(binding): worker and WASM path issues in the export flow to prevent Webpack and Turbopack resolution errors.

BREAKING CHANGE: Updated the export structure for worker and WASM files. Bundlers that relied on the previous export paths may need to update their configurations.
