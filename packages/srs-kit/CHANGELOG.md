# @open-spaced-repetition/srs-kit

## 0.1.0-beta.0

### Minor Changes

- [#390](https://github.com/open-spaced-repetition/ts-fsrs/pull/390) [`34057d3`](https://github.com/open-spaced-repetition/ts-fsrs/commit/34057d34fde775e31c91400adeaeaf349505ba84) Thanks [@ishiko732](https://github.com/ishiko732)! - feat(kit): add chrono contracts and time presets

  Adds schema-driven chrono definitions with projection/default handling and
  exports presets for numeric elapsed days, `Date`, and `Temporal.Instant`.

  Chrono projections now derive previous/current times from card fields plus the
  scheduler-provided time, giving schedulers a stable input for difference and
  default-value generation.

- [#389](https://github.com/open-spaced-repetition/ts-fsrs/pull/389) [`afadfe4`](https://github.com/open-spaced-repetition/ts-fsrs/commit/afadfe4874e836f97a46340e80a01f4527f14fca) Thanks [@ishiko732](https://github.com/ishiko732)! - feat: add SRS framework primitives, schema helpers, and model contracts

  Model definitions validate their own config in `create()` and return the
  validated config on the runtime for scheduler defaults.
