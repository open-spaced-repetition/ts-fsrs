import {
  dateChrono,
  defineScheduler,
  Rating,
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const baseScheduler = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})

const schedulerDefinition = baseScheduler.use(
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware
)

// type FSRSSchedulerCreate = (typeof schedulerDefinition)['create']
// type FSRSScheduler = ReturnType<FSRSSchedulerCreate>
// type FSRSSchedulerCard = ReturnType<FSRSScheduler['newCard']>
// type FSRSSchedulerRevlog = ReturnType<FSRSScheduler['review']>['revlog']
// type FSRSSchedulerPreview = ReturnType<FSRSScheduler['preview']>
// type FSRSSchedulerPreviewItem =
//   FSRSSchedulerPreview extends Iterable<infer Preview> ? Preview : never
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
    enableFuzz: true,
    maximumInterval: 36500,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
  },
})
const now = new Date('2026-01-01T00:00:00.000Z')

const card = scheduler.newCard({ now })
const reviewed = scheduler.review({ card, grade: Rating.Good, now })
const reviewedCard = reviewed.card
const revlog = reviewed.revlog
const preview = scheduler.preview({ card, now })

console.log(
  JSON.stringify(
    {
      reviewed: {
        dueAt: reviewedCard.dueAt.toISOString(),
        stability: Number(reviewedCard.stability.toFixed(4)),
        state: reviewedCard.state,
      },
      rating: revlog.rating,
      preview: preview.map(({ grade, card: next }) => ({
        grade,
        dueAt: next.dueAt.toISOString(),
        stability: Number(next.stability.toFixed(4)),
        difficulty: Number(next.difficulty.toFixed(4)),
      })),
    },
    null,
    2
  )
)
