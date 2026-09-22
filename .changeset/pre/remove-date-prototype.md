---
"ts-fsrs": major
---

- **BREAKING CHANGE:** Removed global `Date.prototype` extensions (`scheduler`, `diff`, `format`, `dueFormat`). Use the standalone functions `date_scheduler()`, `date_diff()`, `formatDate()`, and `show_diff_message()` instead.
- **BREAKING CHANGE:** Removed deprecated helper functions `fixDate()`, `fixState()`, and `fixRating()`. Use `TypeConvert.time()`, `TypeConvert.state()`, and `TypeConvert.rating()` instead.
