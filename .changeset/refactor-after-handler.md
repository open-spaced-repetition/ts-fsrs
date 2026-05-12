---
"ts-fsrs": patch
---

refactor(fsrs): extract `applyAfterHandler` helper to deduplicate `afterHandler` plumbing in `repeat`, `next`, `rollback`, `forget`, and `reschedule`
