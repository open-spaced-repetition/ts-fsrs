import type { FuzzingConfig } from './schema.js'

export type FuzzRange = {
  readonly start: number
  readonly end: number
  readonly factor: number
}

export type FuzzingRng = (seed: string) => () => number

export const FUZZ_RANGES: readonly FuzzRange[] = Object.freeze([
  { start: 2.5, end: 7, factor: 0.15 },
  { start: 7, end: 20, factor: 0.1 },
  { start: 20, end: Number.POSITIVE_INFINITY, factor: 0.05 },
])

export function getFuzzRange(
  interval: number,
  elapsedDays: number,
  maximumInterval: number,
  fuzzRanges: readonly FuzzRange[] = FUZZ_RANGES
): { readonly minInterval: number; readonly maxInterval: number } {
  let delta = 1
  for (const range of fuzzRanges) {
    delta +=
      range.factor * Math.max(Math.min(interval, range.end) - range.start, 0)
  }

  const cappedInterval = Math.min(interval, maximumInterval)
  let minInterval = Math.max(2, Math.round(cappedInterval - delta))
  const maxInterval = Math.min(
    Math.round(cappedInterval + delta),
    maximumInterval
  )
  if (cappedInterval > elapsedDays) {
    minInterval = Math.max(minInterval, elapsedDays + 1)
  }
  minInterval = Math.min(minInterval, maxInterval)
  return { minInterval, maxInterval }
}

function fnv1a32(str: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < str.length; index += 1) {
    hash ^= str.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0

  return () => {
    // biome-ignore lint/suspicious/noAssignInExpressions: PRNG state transition
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const fnv1aMulberry32Rng: FuzzingRng = (seed) =>
  mulberry32(fnv1a32(seed))

/**
 * Returns an integer interval with optional deterministic fuzzing applied.
 */
export function withFuzzing(
  interval: number,
  elapsedDays: number,
  config: FuzzingConfig,
  seed?: string
) {
  if (!config.enableFuzz || interval < 2.5) return Math.round(interval)

  const { minInterval, maxInterval } = getFuzzRange(
    interval,
    elapsedDays,
    config.maximumInterval
  )
  const fuzzFactor = fnv1aMulberry32Rng(seed ?? String(Date.now()))()
  return Math.floor(fuzzFactor * (maxInterval - minInterval + 1) + minInterval)
}
