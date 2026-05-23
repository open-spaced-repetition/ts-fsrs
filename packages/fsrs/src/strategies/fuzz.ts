import { alea } from '../alea'
import { get_fuzz_range } from '../help'
import type { FSRSParameters } from '../models'
import type { int } from '../types'

/**
 * Returns the interval with optional fuzzing applied.
 *
 * If fuzzing is disabled or ivl is less than 2.5, returns the rounded interval as-is.
 * Otherwise, samples a deterministic fuzz value from {@link get_fuzz_range} using the
 * provided seed.
 *
 * @param {number} ivl - The interval to be fuzzed.
 * @param {number} elapsed_days - t days since the last review.
 * @param {FSRSParameters} params - Parameters carrying `enable_fuzz` and `maximum_interval`.
 * @param {string} [seed] - The seed used by the alea generator.
 * @returns {int} The (optionally fuzzed) integer interval.
 */
export function withFuzzing(
  ivl: number,
  elapsed_days: number,
  params: Pick<FSRSParameters, 'enable_fuzz' | 'maximum_interval'>,
  seed?: string
): int {
  if (!params.enable_fuzz || ivl < 2.5) return Math.round(ivl) as int
  const generator = alea(seed)
  const fuzz_factor = generator()
  const { min_ivl, max_ivl } = get_fuzz_range(
    ivl,
    elapsed_days,
    params.maximum_interval
  )
  return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl) as int
}
