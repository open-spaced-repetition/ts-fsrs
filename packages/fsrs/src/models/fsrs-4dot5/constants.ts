import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import type { FSRSState } from '@/models.js'

export const FSRS4Dot5_DECAY = 0.5
export const FSRS4Dot5_FACTOR = 19 / 81
export const INIT_S_MAX = 100.0

export const FSRS4Dot5_MODEL_BOUNDS: ModelBounds<FSRSState> = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS4Dot5_DEFAULT_WEIGHTS = Object.freeze([
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
]) as number[]

// https://github.com/open-spaced-repetition/srs-benchmark/blob/main/models/fsrs_v4dot5.py
export const FSRS4Dot5ParameterBounds = (): [number, number][] => [
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS4Dot5_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [0.0, FSRS4Dot5_MODEL_BOUNDS.dMax],
  [0.01, 5.0],
  [0.01, 5.0],
  [0.0, 0.8],
  [0.0, 6.0],
  [0.0, 0.8],
  [0.01, 5.0],
  [0.2, 6.0],
  [0.01, 0.4],
  [0.01, 0.9],
  [0.01, 4.0],
  [0.0, 1.0],
  [1.0, 10.0],
]
