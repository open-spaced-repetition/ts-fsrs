import type { ModelBounds } from '../../kit'

export const FSRS4Dot5_DECAY = 0.5
export const FSRS4Dot5_FACTOR = 19 / 81
export const INIT_S_MAX = 100.0

export const FSRS4Dot5_MODEL_BOUNDS: ModelBounds = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS4Dot5_DEFAULT_WEIGHTS = Object.freeze([
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
]) as number[]


// TODO: check
export const FSRS4Dot5ParameterBounds = (): [number, number][] => [
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.dMin, FSRS4Dot5_MODEL_BOUNDS.dMax],
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
]
