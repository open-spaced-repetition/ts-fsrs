---
"ts-fsrs": major
---


- **BREAKING CHANGE:** Removed `afterHandler` callback parameter from `createEmptyCard()`, `repeat()`, `next()`, `rollback()`, and `forget()` methods. Transform results externally after calling these methods instead.
- **BREAKING CHANGE:** `reschedule` no longer accepts or applies `recordLogHandler`.

Migration:

```ts
// Before
const card = createEmptyCard(now, cardAfterHandler);
const result = f.repeat(card, now, repeatAfterHandler);
const rescheduled = f.reschedule(card, reviews, { recordLogHandler: fn });

// After
const card = createEmptyCard(now);
const result = repeatAfterHandler(f.repeat(card, now));
const rescheduled = f.reschedule(card, reviews);
// transform rescheduled.collections externally
```