---
"ts-fsrs": major
---

**BREAKING CHANGE:** Remove deprecated `elapsed_days` field from `Card` interface and `elapsed_days`/`last_elapsed_days` fields from `ReviewLog` interface.

These fields were marked as deprecated since v5 and scheduled for removal in v6.0.0. When needed, `card.elapsed_days` can be derived from `card.last_review`.

Migration: Remove any references to `card.elapsed_days`, `log.elapsed_days`, and `log.last_elapsed_days` from your code. If you still need an elapsed-days value, derive card values from `card.last_review` using `date_diff()`, and for review logs replace `log.elapsed_days` with `date_diff(log.review, log.due, 'days')`.
