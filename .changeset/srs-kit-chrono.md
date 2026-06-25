---
"@open-spaced-repetition/srs-kit": minor
---

feat(kit): add chrono contracts and time presets

Adds schema-driven chrono definitions with projection/default handling and
exports presets for numeric elapsed days, `Date`, `Temporal.Instant`, and
`Temporal.ZonedDateTime`.

Chrono projections now derive previous/current times from card fields plus the
scheduler-provided time, giving schedulers a stable input for difference and
default-value generation.
