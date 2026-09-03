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
    leechThreshold: 2,
  },
})

const createdAt = new Date('2026-01-01T00:00:00.000Z')
const firstReview = new Date('2026-01-02T09:30:00.000Z')
export const now = new Date('2026-01-06T08:45:00.000Z')

const { card: learned } = scheduler.review({
  card: scheduler.newCard({ now: createdAt }),
  grade: Rating.Good,
  now: firstReview,
})

const secondReview = new Date('2026-01-04T20:15:00.000Z')
export const { card } = scheduler.review({
  card: learned,
  grade: Rating.Again,
  now: secondReview,
})

// One lapse on record, so Again reaches `leechThreshold` and suspends the card.
export const outcomes = scheduler.preview({ card, now })
