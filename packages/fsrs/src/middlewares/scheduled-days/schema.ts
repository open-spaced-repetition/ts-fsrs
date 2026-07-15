import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'

export type ScheduledDaysFields = {
  readonly scheduledDays: number
}

export const scheduledDaysFieldsSchema = defineSchema<ScheduledDaysFields>(
  (value) => {
    if (
      !isObject(value) ||
      typeof value.scheduledDays !== 'number' ||
      !Number.isFinite(value.scheduledDays)
    ) {
      return {
        issues: [{ message: 'Expected finite scheduledDays' }],
      }
    }

    return { value: { scheduledDays: value.scheduledDays } }
  }
)
