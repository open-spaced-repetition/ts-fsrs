import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

// 1) Reusable definition.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(
  schedulerDesiredRetentionMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerMonotonicIntervalMiddleware
)

// 2) create() validates the config and returns an instance.
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.99,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const review = scheduler.review({ card, grade: Rating.Good, now }).card
// High retention makes raw intervals overlap, so the policy must adjust them.
const candidates = Array.from(
  scheduler.preview({ card: review, now: review.dueAt })
)
const days = candidates.map(({ card }) => card.scheduledDays)
const dueDays = candidates.map(
  ({ card }) => (card.dueAt.getTime() - review.dueAt.getTime()) / 86_400_000
)

console.log(JSON.stringify({ days, dueDays }))
