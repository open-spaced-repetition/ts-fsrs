import { defineSchema, isObject } from '@/schema/index.js'

export type StatsCardFields = {
  readonly reps: number
  readonly lapses: number
}

export type StatsConfigInput = {
  /**
   * When forget receives an existing card, clear reps/lapses instead of
   * carrying the previous counters forward. Defaults to true.
   */
  readonly clearStatsOnForget?: boolean
}

export type StatsConfig = {
  readonly clearStatsOnForget: boolean
}

export const statsConfigSchema = defineSchema<StatsConfigInput, StatsConfig>(
  (value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected stats config object' }] }
    }

    const { clearStatsOnForget } = value
    if (clearStatsOnForget === undefined) {
      return { value: { clearStatsOnForget: true } }
    }
    if (typeof clearStatsOnForget !== 'boolean') {
      return { issues: [{ message: 'Expected boolean clearStatsOnForget' }] }
    }

    return {
      value: {
        clearStatsOnForget,
      },
    }
  }
)

export const statsFieldsSchema = defineSchema<StatsCardFields>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected stats object' }] }
  }

  const { reps, lapses } = value
  if (typeof reps !== 'number' || !Number.isInteger(reps) || reps < 0) {
    return { issues: [{ message: 'Expected non-negative integer reps' }] }
  }
  if (typeof lapses !== 'number' || !Number.isInteger(lapses) || lapses < 0) {
    return { issues: [{ message: 'Expected non-negative integer lapses' }] }
  }

  return {
    value: {
      reps,
      lapses,
    },
  }
})
