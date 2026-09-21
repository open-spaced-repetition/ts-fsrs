import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { schedulerDesiredRetentionMiddleware } from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

// Compose a reusable definition once, at the program level.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware)

const now = new Date('2026-01-01T00:00:00.000Z')

// Each .create() validates its own config and returns an independent scheduler.
const library = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
  },
})
const exam = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.8,
  },
})

function nextGoodDue(scheduler: typeof library) {
  const card = scheduler.newCard({ now })
  return scheduler
    .review({ card, grade: Rating.Good, now })
    .card.dueAt.toISOString()
}

console.log(
  JSON.stringify(
    {
      libraryRetention: 0.9,
      libraryDue: nextGoodDue(library),
      examRetention: 0.8,
      examDue: nextGoodDue(exam),
    },
    null,
    2
  )
)
