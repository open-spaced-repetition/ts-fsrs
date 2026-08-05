import { defineScheduler, Rating } from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6/constants'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6/model'
import { Reschedule } from 'ts-fsrs/rescheduler'
import { bench, describe } from 'vitest'

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
const reschedule = new Reschedule(scheduler)
const ratings = [Rating.Good, Rating.Hard, Rating.Easy, Rating.Again] as const
const history = Array.from({ length: HISTORY_SIZE }, (_, index) => ({
  rating: ratings[index % ratings.length],
  reviewTime: new Date((index + 1) * DAY_MS),
}))
const modelHistory = history.map((review, index) => ({
  rating: review.rating,
  deltaT: index === 0 ? 0 : 1,
}))
let sink = 0

function consume(stability: number): void {
  sink = (sink + stability) % Number.MAX_SAFE_INTEGER
}

describe(`replay ${HISTORY_SIZE} reviews (memory only)`, () => {
  bench('model.forward', () => {
    const states = scheduler.model.forward({ history: modelHistory })
    consume(states[states.length - 1].stability)
  })

  bench('Reschedule.replay', () => {
    consume(reschedule.replay({ history }).memoryState.stability)
  })
})

describe(`reschedule ${HISTORY_SIZE} reviews (card + revlog)`, () => {
  bench('scheduler.forward', () => {
    const results = scheduler.forward({ history })
    consume(results[results.length - 1].card.stability)
  })

  bench('Reschedule.reschedule', () => {
    consume(reschedule.reschedule({ history }).card.stability)
  })
})
