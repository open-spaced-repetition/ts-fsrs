# @open-spaced-repetition/srs-kit

Shared SRS framework primitives, schema helpers, model contracts, middleware helpers, and scheduler building blocks for the Open Spaced Repetition `ts-fsrs` project.

## Development status

`srs-kit` is currently under active development. It is published as a public package so `ts-fsrs` and related packages can consume the shared implementation while the framework is being refined.

The APIs in this package should be treated as unstable. Method names, function signatures, exports, types, schemas, scheduler contracts, and runtime behavior may change in future releases, including changes announced through changesets. Do not assume compatibility across versions unless a future release explicitly documents a stability guarantee.

For stable spaced-repetition scheduling APIs, use the public `ts-fsrs` package instead of depending on `@open-spaced-repetition/srs-kit` directly.

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
