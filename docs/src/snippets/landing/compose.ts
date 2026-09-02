import {
  dateChrono,
  defineScheduler,
  Rating,
  schedulerLeechMiddleware,
} from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const fsrs6 = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
const withLeech = fsrs6.use(schedulerLeechMiddleware)

export const scheduler = withLeech.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: false,
    numRelearningSteps: 0,
    leechThreshold: 8,
  },
})

const firstReview = new Date('2026-01-01T00:00:00.000Z')
const reviewed = scheduler.review({
  card: scheduler.newCard({ now: firstReview }),
  grade: Rating.Good,
  now: firstReview,
}).card

// Seven lapses in, so the eighth reaches the threshold: grading this card
// Again suspends it instead of scheduling another review.
export const now = new Date('2026-01-05T00:00:00.000Z')
export const card = { ...reviewed, lapses: 7 }
