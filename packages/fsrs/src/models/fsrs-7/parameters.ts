import { FSRSValidationError } from '@/error.js'
import { clamp } from '@/help.js'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7_PARAMETER_BOUNDS } from './constants.js'

/** FSRS-7's fast trace is intrinsic; clipping is independent of learning steps. */
export function clipFSRS7Parameters(parameters: readonly number[]): number[] {
  const clipped = Array.from(parameters)
  if (clipped.length < FSRS7_DEFAULT_WEIGHTS.length) return clipped
  for (const [index, [min, max]] of FSRS7_PARAMETER_BOUNDS.entries()) {
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
