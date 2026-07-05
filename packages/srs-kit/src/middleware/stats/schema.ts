import { defineSchema, isObject } from '@/schema/index.js'

export type StatsCardFields = {
  readonly reps: number
  readonly lapses: number
}

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
