import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import type { FSRSState } from '../../models.js'

export const FSRS5_DECAY = 0.5
export const FSRS5_FACTOR = 19 / 81
export const FSRS5_W17_W18_CEILING = 2.0
export const INIT_S_MAX = 100.0

export const FSRS5_MODEL_BOUNDS: ModelBounds<FSRSState> = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS5_DEFAULT_WEIGHTS = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
]) as number[]

export const FSRS5ParameterBounds = (): [number, number][] => [
  [FSRS5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS5_MODEL_BOUNDS.dMin, FSRS5_MODEL_BOUNDS.dMax],
  [0.001, 4.0],
  [0.001, 4.0],
  [0.001, 0.75],
  [0.0, 4.5],
  [0.0, 0.8],
  [0.001, 3.5],
  [0.001, 5.0],
  [0.001, 0.25],
  [0.001, 0.9],
  [0.0, 4.0],
  [0.0, 1.0],
  [1.0, 6.0],
  [0.0, FSRS5_W17_W18_CEILING],
  [0.0, FSRS5_W17_W18_CEILING],
]
