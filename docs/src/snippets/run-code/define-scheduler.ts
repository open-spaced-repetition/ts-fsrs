import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7'

// Reuse this definition as the program's scheduling preset.
const schedulerDefinition = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
})

// Create an independent scheduler when a user's config is available.
const scheduler = schedulerDefinition.create({
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
