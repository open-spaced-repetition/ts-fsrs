import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import type { FSRS7State } from './schema.js'

export const INIT_S_MAX = 100.0

export const FSRS7_MODEL_BOUNDS = Object.freeze({
  sMin: 0.0001,
  sMax: 36500,
  stabilityFastMin: 0.0001,
  stabilityFastMax: 36500,
  dMin: 1,
  dMax: 10,
}) satisfies ModelBounds<FSRS7State>

// fsrs-rs c9562d6: inference_v7.rs (also srs-benchmark FSRS7.init_w).
export const FSRS7_DEFAULT_WEIGHTS = Object.freeze([
  0.1104, 2.2395, 3.9221, 11.7841, 6.1686, 0.6457, 3.6807, 1.9795, 0, 1.3826,
  0.7024, 0.5999, 0.8146, 0.6398, 1, 1.3207, 0.6707, 3.8668, 0.4416, 0.0934,
  1.8631, 0.6162, 1.0869, 0.1567, 0.0801, 0.2421, 0.9464, 0.1433, 0.7145, 0,
  0.5667, 0.3734, 0.5333, 0.3048,
]) as number[]

export const MIN_T = 1 / 86400
export const LOG_MIN_T = Math.log(MIN_T)
export const DR_MIN = 0.0001
export const DR_MAX = 0.9999
