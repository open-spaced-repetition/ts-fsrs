import {
  dateChrono,
  defineScheduler,
  Rating,
  schedulerLeechMiddleware,
} from 'ts-fsrs'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7'

const fsrs7 = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
const withLeech = fsrs7.use(schedulerLeechMiddleware)

export const scheduler = withLeech.create({
  config: {
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: true,
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
