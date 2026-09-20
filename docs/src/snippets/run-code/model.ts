import { Rating } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const model = FSRS6Model.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1, // Constrains weights; middleware runs the steps.
  },
})

const memoryState = model.step({
  memoryState: null,
  rating: Rating.Good,
  elapsedDays: 0,
})
const desiredRetention = 0.9
const interval = model.nextInterval(memoryState, desiredRetention)
const retrievabilityAtInterval = model.forgettingCurve(memoryState, interval)

console.log(
  JSON.stringify(
    {
      memoryState,
      desiredRetention,
      interval,
      retrievabilityAtInterval,
    },
    null,
    2
  )
)
