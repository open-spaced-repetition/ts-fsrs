import { Rating } from 'ts-fsrs'
import {
  checkFSRS7Parameters,
  clipFSRS7Parameters,
  FSRS7_DEFAULT_WEIGHTS,
  FSRS7_MODEL_BOUNDS,
  type FSRS7Config,
  FSRS7Model,
  type FSRS7State,
  migrateFSRS7Parameters,
} from 'ts-fsrs/models/fsrs-7'

console.log(JSON.stringify(FSRS7_MODEL_BOUNDS))

// Clip a full weight array; shorter arrays are not padded.
const weights = [...FSRS7_DEFAULT_WEIGHTS]
weights[0] = -1
console.log(JSON.stringify({ w0: clipFSRS7Parameters(weights)[0] }))
console.log(
  JSON.stringify({
    accepted: checkFSRS7Parameters(FSRS7_DEFAULT_WEIGHTS).length,
  })
)

// Absent or empty input uses defaults; nonempty input must contain 34 weights.
console.log(JSON.stringify({ migrated: migrateFSRS7Parameters().length }))

const config: FSRS7Config = { weights: FSRS7_DEFAULT_WEIGHTS }
const model = FSRS7Model.create({ config })
const state: FSRS7State = model.step({
  memoryState: null,
  rating: Rating.Good,
  elapsedDays: 0,
})
const interval = model.nextInterval(state, 0.9)

console.log(JSON.stringify(state))
console.log(
  JSON.stringify({
    intervalDays: Number(interval.toFixed(6)),
    retrievability: Number(model.forgettingCurve(state, interval).toFixed(6)),
  })
)
