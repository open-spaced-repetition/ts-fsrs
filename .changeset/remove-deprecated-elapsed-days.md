---
"ts-fsrs": major
---

**BREAKING CHANGE:** Remove deprecated `elapsed_days` field from `Card` interface and `elapsed_days`/`last_elapsed_days` fields from `ReviewLog` interface.

These fields were marked as deprecated since v5 and scheduled for removal in v6.0.0. The `elapsed_days` information can be derived from `last_review` dates when needed.

Migration: Remove any references to `card.elapsed_days`, `log.elapsed_days`, and `log.last_elapsed_days` from your code. If you need the elapsed days value, calculate it from `last_review` dates using `date_diff()`.
