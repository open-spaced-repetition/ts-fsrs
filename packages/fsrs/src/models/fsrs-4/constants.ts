import type { ModelBounds } from '../../kit'

export const INIT_S_MAX = 100.0

export const FSRS4_MODEL_BOUNDS: ModelBounds = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS4_DEFAULT_WEIGHTS = Object.freeze([
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
]) as number[]
