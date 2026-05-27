---
"ts-fsrs": major
---

### Breaking Changes

- Removed `afterHandler` callback parameter from `createEmptyCard()`, `repeat()`, `next()`, `rollback()`, and `forget()` methods. Transform results externally after calling these methods instead.
