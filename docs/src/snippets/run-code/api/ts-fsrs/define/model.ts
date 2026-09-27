import { Rating } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const model = FSRS6Model.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
  },
})

const memoryState = model.step({
  memoryState: null,
  rating: Rating.Good,
  elapsedDays: 0,
})
const desiredRetention = 0.9
const interval = model.nextInterval(memoryState, desiredRetention)
const retrievability = model.forgettingCurve(memoryState, interval)

console.log(
  JSON.stringify({
    stability: memoryState.stability,
    difficulty: memoryState.difficulty,
    interval,
    retrievabilityAtInterval: retrievability,
  })
)
