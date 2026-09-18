import { FSRSValidationError } from '@/error.js'
import { clamp } from '@/help.js'
import {
  FSRS7_DEFAULT_WEIGHTS,
  FSRS7_MODEL_BOUNDS,
  INIT_S_MAX,
} from './constants.js'

const { sMin, dMin, dMax } = FSRS7_MODEL_BOUNDS

// fsrs-rs parameter_clipper_v7.rs. Cross-parameter lower bounds are applied below.
const bounds: readonly (readonly [number, number])[] = [
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

/** FSRS-7's fast trace is intrinsic; clipping is independent of learning steps. */
export function clipFSRS7Parameters(parameters: readonly number[]): number[] {
  const clipped = Array.from(parameters)
  if (clipped.length < FSRS7_DEFAULT_WEIGHTS.length) return clipped
  for (const [index, [min, max]] of bounds.entries()) {
    // Box clamp first, then the cross-parameter monotonicity, matching srs-benchmark.
    const low =
      index > 0 && index < 4
        ? Math.max(min, clipped[index - 1])
        : index === 26
          ? Math.max(min, clipped[25])
          : min
    clipped[index] = clamp(
      Number.isFinite(clipped[index]) ? clipped[index] : low,
      low,
      max
    )
  }
  return clipped
}

export function checkFSRS7Parameters(parameters: readonly number[]) {
  if (
    parameters.length !== FSRS7_DEFAULT_WEIGHTS.length ||
    !clipFSRS7Parameters(parameters).every(
      (value, index) => value === parameters[index]
    )
  ) {
    throw new FSRSValidationError('Expected FSRS7 weights within model bounds.')
  }
  return parameters
}

/** Previous FSRS parameter layouts cannot be converted into the dual-trace model. */
export function migrateFSRS7Parameters(
  parameters?: readonly number[]
): number[] {
  if (!parameters || parameters.length === 0) return [...FSRS7_DEFAULT_WEIGHTS]
  if (parameters.length !== FSRS7_DEFAULT_WEIGHTS.length) {
    throw new FSRSValidationError(
      `Invalid parameters length "${parameters.length}", expected 34. FSRS-7 requires its own weights; replay review history to migrate memory states.`
    )
  }
  return Array.from(parameters)
}
