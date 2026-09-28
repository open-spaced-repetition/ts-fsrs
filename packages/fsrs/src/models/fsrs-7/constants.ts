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

const { sMin, dMin, dMax } = FSRS7_MODEL_BOUNDS

// fsrs-rs parameter_clipper_v7.rs. Cross-parameter bounds are enforced by the clipper.
/** Box bounds in weight-index order; the clipper also enforces cross-parameter constraints. */
export const FSRS7_PARAMETER_BOUNDS: readonly (readonly [number, number])[] = [
  [sMin, INIT_S_MAX / 2],
  [sMin, INIT_S_MAX],
  [sMin, INIT_S_MAX],
  [sMin, INIT_S_MAX],
  [dMin, dMax],
  [0.001, 4],
  [0.1, 4],
  [0, 4],
  [0, 1.2],
  [0.3, 3],
  [0.01, 1.5],
  [0.1, 1],
  [0, 3.5],
  [0, 1],
  [1, 7],
  [0, 4],
  [0, 2],
  [0.5, 6],
  [0.001, 1.5],
  [0.001, 1],
  [0, 5],
  [0, 1],
  [1, 7],
  [0.01, 0.25],
  [0.01, 0.95],
  [0.2, 0.85],
  // base2 floor follows srs-benchmark (_CLIP_LO[26] = 0.5); fsrs-rs currently folds
  // the box clamp into the monotonicity check and loses this floor.
  // https://github.com/open-spaced-repetition/srs-benchmark/blob/b4b02549fdf21afcbeb5f4098f6c3623c46ca5d2/models/fsrs_v7.py#L37
  [0.5, 0.99],
  [0.01, 1],
  [0.1, 1],
  [0, 0.9],
  [0.1, 1.1],
  [0, 1],
  [0, 0.6],
  [0, 0.6],
]

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
