import { dateSchema } from '@/schema/field.js'
import { defineSchema, isObject } from '@/schema/index.js'

export const MS_PER_DAY = 86_400_000

export type DateCardInputFields = {
  dueAt: Date
  lastReviewAt?: Date | null
}

export type DateCardOutputFields = {
  dueAt: Date
  lastReviewAt: Date | null
}

export type DateRevlogFields = {
  dueAt: Date
  reviewTime: Date
}

function isValidDate(value: unknown): value is Date {
  return dateSchema.safeParse(value).success
}

function invalidDateFields() {
  return { issues: [{ message: 'Expected valid Date fields' }] }
}

export const dateCardFieldsSchema = defineSchema<
  DateCardInputFields,
  DateCardOutputFields
>((value) => {
  if (!isObject(value) || !('dueAt' in value)) {
    return invalidDateFields()
  }

  const { dueAt, lastReviewAt } = value
  if (!isValidDate(dueAt)) {
    return invalidDateFields()
  }
  if (
    lastReviewAt !== undefined &&
    lastReviewAt !== null &&
    !isValidDate(lastReviewAt)
  ) {
    return invalidDateFields()
  }

  return {
    value: {
      dueAt,
      lastReviewAt: lastReviewAt !== undefined ? lastReviewAt : null,
    },
  }
})

export const dateRevlogFieldsSchema = defineSchema<DateRevlogFields>(
  (value: unknown) => {
    if (!isObject(value) || !('dueAt' in value) || !('reviewTime' in value)) {
      return invalidDateFields()
    }

    const { dueAt, reviewTime } = value
    if (!isValidDate(dueAt) || !isValidDate(reviewTime)) {
      return invalidDateFields()
    }

    return { value: { dueAt, reviewTime } }
  }
)
