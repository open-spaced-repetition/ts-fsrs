import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerMaximumIntervalMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'
import { Reschedule } from 'ts-fsrs/reschedule'

// 1) Reusable definition.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware, schedulerMaximumIntervalMiddleware)

// 2) create() validates the config and returns an instance.
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
    maximumInterval: 60,
  },
})

const reschedule = new Reschedule(scheduler)
const now = new Date('2026-01-01T00:00:00.000Z')
const history = [{ rating: Rating.Good, reviewTime: now }]

// Rebuild the memory state from the review history alone.
const replay = reschedule.replay({ history })

// Or replay it through the scheduler to recompute the card and revlogs.
const card = scheduler.newCard({ now })
const result = reschedule.reschedule({ history, initialCard: card })

console.log(
  JSON.stringify({
    replayStability: replay.memoryState?.stability,
    due: result.card.dueAt.toISOString(),
    reviews: result.results.length,
  })
)
