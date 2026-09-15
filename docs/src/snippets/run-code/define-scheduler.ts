import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7'

const scheduler = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
}).create({
  config: {
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: true,
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
      difficulty: result.card.difficulty,
      stabilityFast: result.card.stabilityFast,
      rating: result.revlog.rating,
    },
    null,
    2
  )
)
