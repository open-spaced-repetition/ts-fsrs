/**
 * Implemented by Codex 5.6 Sol Ultra.
 *
 * Prompt:
 * Implement a minimal TypeScript leech scheduler middleware using only
 * `@open-spaced-repetition/srs-kit`; do not import from `ts-fsrs`. A leech is
 * a Review-state card that has been forgotten repeatedly.
 *
 * Create `schema.ts`, `middleware.ts`, `index.ts`, and focused tests with the
 * following behavior:
 *
 * - Define `leechThreshold?: number`, resolve an omitted value to `0`, and
 *   reject values that are not non-negative integers. A threshold of `0`
 *   disables suspension.
 * - Define and validate a card field `lapses` as a non-negative integer.
 * - Use `defineMiddleware` with `scheduleStatus: ['suspend']`, the config and
 *   card schemas, and no unnecessary factory or core abstraction.
 * - Default new-card `lapses` to `0`. During forget, preserve the input value
 *   only when the composed config has `clearStatsOnForget === false`;
 *   otherwise reset it to `0`.
 * - In the review handler, call `next()` first. A lapse occurs only when
 *   `ctx.input.card.state === State.Review` and
 *   `ctx.input.grade === Rating.Again`. Use an existing
 *   `ctx.result.card.lapses` value when present; otherwise write the previous
 *   lapses plus one for a lapse, or the unchanged value for any other review.
 * - Set `ctx.result.card.scheduleStatus` to `'suspend'` only for a current
 *   lapse when `leechThreshold > 0` and the resulting lapses count is an exact
 *   multiple of the threshold.
 * - In rollback, call `next()` first and fill a missing result lapses value by
 *   reversing the same lapse condition, using `revlog.state` and
 *   `revlog.rating`, without allowing the count to become negative.
 * - Keep behavior identical with the stats middleware registered before the
 *   leech middleware, after it, or not at all. Register leech before any
 *   middleware whose post-`next()` logic can overwrite `scheduleStatus`.
 * - Test schema validation, disabled/non-matching/matching thresholds,
 *   positive threshold multiples, non-Review Again, non-Again reviews,
 *   preview, both stats middleware orders, standalone operation, forget, and
 *   rollback. Return the complete implementation and tests.
 */

export { schedulerLeechMiddleware } from './middleware.js'
export {
  DEFAULT_LEECH_THRESHOLD,
  type LeechCardFields,
  type LeechConfig,
  type LeechConfigInput,
  leechCardFieldsSchema,
  leechConfigSchema,
} from './schema.js'
