---
"@open-spaced-repetition/binding": minor
---

feat(binding): add `initOptimizer` dynamic loader for custom wasm/worker resources

- Export `./dynamic-wasi` entry from `binding` with `initOptimizer(options)` for Node.js and browser
- Export `./wasi-worker` and `./wasm` entries from `binding-wasm32-wasi` for resolving worker and wasm paths
- Allows users to provide wasm binary (Buffer, URL, Response) and worker (factory, instance, path) externally
