import type { ModelBounds } from '../../kit'

export const INIT_S_MAX = 100.0

export const FSRS3_MODEL_BOUNDS: ModelBounds = Object.freeze({
  sMin: 0.01,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS3_DEFAULT_WEIGHTS = Object.freeze([
  0.9605, 1.7234, 4.8527, -1.1917, -1.2956, 0.0573, 1.7352, -0.1673, 1.065,
  1.8907, -0.3832, 0.5867, 1.0721,
]) as number[]
