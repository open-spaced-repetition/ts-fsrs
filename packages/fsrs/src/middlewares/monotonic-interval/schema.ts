import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'

export type MonotonicIntervalConfigInput = {
  readonly maximumInterval?: number
}

export type MonotonicIntervalConfig = {
  readonly maximumInterval: number
}

export const DEFAULT_MAXIMUM_INTERVAL = 36_500

export const monotonicIntervalConfigSchema = defineSchema<
  MonotonicIntervalConfigInput,
  MonotonicIntervalConfig
>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected monotonic interval config' }] }
  }

  const maximumInterval =
    value.maximumInterval === undefined
      ? DEFAULT_MAXIMUM_INTERVAL
      : value.maximumInterval
  if (
    typeof maximumInterval !== 'number' ||
    !Number.isFinite(maximumInterval) ||
    maximumInterval <= 0
  ) {
    return { issues: [{ message: 'Expected positive maximumInterval' }] }
  }

  return { value: { maximumInterval } }
})
