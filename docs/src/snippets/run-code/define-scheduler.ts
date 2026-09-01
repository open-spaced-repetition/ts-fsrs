import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const scheduler = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(
  JSON.stringify(
    {
      state: result.card.state,
      dueAt: result.card.dueAt,
      stability: result.card.stability,
      rating: result.revlog.rating,
    },
    null,
    2
  )
)
