import { defineScheduler, Rating } from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { bench, describe } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6/constants'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6/model'
import { Rescheduler } from 'ts-fsrs/rescheduler'

const DAY_MS = 86_400_000
const HISTORY_SIZE = 100
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
const rescheduler = new Rescheduler(scheduler)
const ratings = [
  Rating.Good,
  Rating.Hard,
  Rating.Easy,
  Rating.Again,
] as const
const history = Array.from({ length: HISTORY_SIZE }, (_, index) => ({
  rating: ratings[index % ratings.length],
  reviewTime: new Date(index * DAY_MS),
}))
const modelHistory = history.map((review, index) => ({
  rating: review.rating,
  deltaT: index === 0 ? 0 : 1,
}))
let sink = 0

function consume(memoryState: { readonly stability: number }): void {
  sink = (sink + memoryState.stability) % Number.MAX_SAFE_INTEGER
}

describe(`reschedule ${HISTORY_SIZE} reviews`, () => {
  bench('model.forward', () => {
    const states = scheduler.model.forward({ history: modelHistory })
    consume(states[states.length - 1])
  })

  bench('Rescheduler.reschedule', () => {
    consume(rescheduler.reschedule({ history }).memoryState)
  })
})
