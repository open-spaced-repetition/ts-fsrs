import {
  defineSchema,
  isObject,
  scheduledDaysSchema,
} from '@open-spaced-repetition/srs-kit'

export type ScheduledDaysFields = {
  readonly scheduledDays: number
}

export const scheduledDaysFieldsSchema = defineSchema<ScheduledDaysFields>(
  (value) => {
    if (!isObject(value)) {
      return {
        issues: [{ message: 'Expected object with scheduledDays' }],
      }
    }

    const scheduledDays = scheduledDaysSchema.safeParse(value.scheduledDays)
    if (!scheduledDays.success) {
      return scheduledDays
    }

    return { value: { scheduledDays: scheduledDays.data } }
  }
)
