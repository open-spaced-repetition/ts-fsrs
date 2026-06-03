import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import type { FSRSState } from '../../models.js'

export const INIT_S_MAX = 100.0

export const FSRS4_MODEL_BOUNDS: ModelBounds<FSRSState> = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS4_DEFAULT_WEIGHTS = Object.freeze([
  0.4, 0.9, 2.3, 10.9, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
]) as number[]

export const FSRS4ParameterBounds = (): [number, number][] => [
  [FSRS4_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [1.0, 10.0],
  [0.1, 5.0],
  [0.1, 5.0],
  [0.0, 0.5],
  [0.0, 3.0],
  [0.1, 0.8],
  [0.01, 2.5],
  [0.5, 5.0],
  [0.01, 0.2],
  [0.01, 0.9],
  [0.01, 2.0],
  [0.0, 1.0],
  [1.0, 4.0],
]
