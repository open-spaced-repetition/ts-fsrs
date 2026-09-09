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

export type DateRevlogInputFields = {
  dueAt: Date
  lastReviewAt?: Date | null
  reviewTime: Date
}

/** Pre-review card timestamps plus the time of the recorded review. */
export type DateRevlogFields = {
  dueAt: Date
  lastReviewAt: Date | null
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

export const dateRevlogFieldsSchema = defineSchema<
  DateRevlogInputFields,
  DateRevlogFields
>((value) => {
  if (!isObject(value) || !('reviewTime' in value)) {
    return invalidDateFields()
  }

  const card = dateCardFieldsSchema['~standard'].validate(value)
  if (card.issues) return card

  const { reviewTime } = value
  if (!isValidDate(reviewTime)) {
    return invalidDateFields()
  }

  const revlog = card.value as DateRevlogFields
  revlog.reviewTime = reviewTime
  return { value: revlog }
})
