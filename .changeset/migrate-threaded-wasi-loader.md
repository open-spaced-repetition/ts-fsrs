---
"@open-spaced-repetition/binding": minor
---

feat(binding): migrate the native and threaded WASI loaders to napi-rs 3.12 and emnapi v2.

The package now requires Node.js 24, publishes one ESM default loader, and exposes the rebuilt threaded loader through `./dynamic`. The existing `./dynamic-wasi` subpath remains as an alias.
