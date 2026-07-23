---
"@open-spaced-repetition/srs-kit": minor
---

Publish `@open-spaced-repetition/srs-kit` as a public BSD-licensed package.

This initial public release includes the shared SRS framework primitives used by `ts-fsrs`:

- schema helpers for validating cards, review logs, models, schedulers, and middleware options;
- schedule status and rating primitives;
- model contracts with config validation, migration hooks, parameter clipping, and scheduler reuse support;
- chrono contracts and presets for numeric elapsed days, `Date`, and `Temporal.Instant`;
- middleware definition and composition helpers;
- scheduler creation APIs for review, rollback, forget, card initialization, chrono defaults, and middleware finalization.
