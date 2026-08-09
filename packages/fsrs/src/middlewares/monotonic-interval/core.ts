import type { Mutable } from '@open-spaced-repetition/srs-kit/schema'

export type IntervalCandidates =
  | readonly [number]
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number]

type ScheduledDays<T extends readonly number[]> = Mutable<{
  [K in keyof T]: number
}>

/**
 * Keeps rating intervals monotonic after rounding and fuzzing.
 *
 * The first interval is capped at the maximum. Zero-day intervals may remain
 * equal; after a positive result, each later interval is kept at least one day
 * after the previous result until the maximum is reached. The input tuple is
 * never mutated.
 */
export function calculateScheduleDays<const T extends IntervalCandidates>(
  candidates: T,
  maximumInterval: number
): ScheduledDays<T> {
  const first = Math.min(candidates[0], maximumInterval)
  if (candidates.length === 1) {
    return [first] as ScheduledDays<T>
  }

  const second = Math.min(
    Math.max(candidates[1], first === 0 ? 0 : first + 1),
    maximumInterval
  )
  if (candidates.length === 2) {
    return [first, second] as ScheduledDays<T>
  }

  const third = Math.min(
    Math.max(candidates[2], second === 0 ? 0 : second + 1),
    maximumInterval
  )
  if (candidates.length === 3) {
    return [first, second, third] as ScheduledDays<T>
  }

  const fourth = Math.min(
    Math.max(candidates[3], third === 0 ? 0 : third + 1),
    maximumInterval
  )
  return [first, second, third, fourth] as ScheduledDays<T>
}

export function calculateScheduleDay(
  candidates: IntervalCandidates,
  maximumInterval: number
): number {
  let scheduledDay = Math.min(candidates[0], maximumInterval)
  for (let index = 1; index < candidates.length; index++) {
    scheduledDay = Math.min(
      Math.max(candidates[index], scheduledDay === 0 ? 0 : scheduledDay + 1),
      maximumInterval
    )
  }
  return scheduledDay
}
