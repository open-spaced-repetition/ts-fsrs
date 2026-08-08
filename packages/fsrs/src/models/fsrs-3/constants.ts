import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import type { FSRSState } from '@/models.js'

export const FSRS3_MODEL_BOUNDS: ModelBounds<FSRSState> = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS3_DEFAULT_WEIGHTS = Object.freeze([
  0.9605, 1.7234, 4.8527, -1.1917, -1.2956, 0.0573, 1.7352, -0.1673, 1.065,
  1.8907, -0.3832, 0.5867, 1.0721,
]) as number[]

// https://github.com/open-spaced-repetition/srs-benchmark/blob/main/models/fsrs_v3.py
export const FSRS3ParameterBounds = (): [number, number][] => [
  [0.1, 10.0],
  [0.1, 5.0],
  [FSRS3_MODEL_BOUNDS.dMin, FSRS3_MODEL_BOUNDS.dMax],
  [-5.0, -0.1],
  [-5.0, -0.1],
  [0.05, 0.5],
  [0.0, 2.0],
  [-0.8, -0.15],
  [0.01, 1.5],
  [0.5, 5.0],
  [-2.0, -0.01],
  [0.01, 0.9],
  [0.01, 2.0],
]
