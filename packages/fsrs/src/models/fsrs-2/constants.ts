import type { ModelBounds } from '../../kit'

export const FSRS2_MODEL_BOUNDS: ModelBounds = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS2_DEFAULT_WEIGHTS = Object.freeze([
  1, 1, 1, -1, -1, 0.2, 3, -0.8, -0.2, 1.3, 2.6, -0.2, 0.6, 1.5,
]) as number[]

export const FSRS2ParameterBounds = (): [number, number][] => [
  [0.1, 10.0],
  [0.01, 10.0],
  [FSRS2_MODEL_BOUNDS.dMin, FSRS2_MODEL_BOUNDS.dMax],
  [-10.0, -0.01],
  [-10.0, -0.01],
  [0.0, 1.0],
  [0.0, 5.0],
  [-2.0, -0.01],
  [-2.0, -0.01],
  [0.01, 2.0],
  [0.0, 5.0],
  [-2.0, -0.01],
  [0.01, 1.0],
  [0.01, 2.0],
]
