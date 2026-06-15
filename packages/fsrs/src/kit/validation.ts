import { z } from 'zod/mini'
import { FSRSValidationError } from '../error.js'
import { type Grade, Rating } from '../models.js'

export const reviewRatingSchema = z.custom<Grade>(
  (data) =>
    typeof data === 'number' &&
    Number.isInteger(data) &&
    data >= Rating.Again &&
    data <= Rating.Easy
)

export function parseOrThrow<Schema extends z.core.$ZodType>(
  schema: Schema,
  data: unknown,
  msg: string = 'Invalid data'
): z.output<Schema> {
  const result = z.safeParse(schema, data)
  if (!result.success) {
    throw new FSRSValidationError(`${msg}: ${formatValidationData(data)}`)
  }

  return result.data
}

export function parseReviewRating(rating: Grade): Grade {
  return parseOrThrow(
    reviewRatingSchema,
    rating,
    `Invalid grade "${rating}", expected 1-4`
  )
}

function formatValidationData(data: unknown): string {
  try {
    return JSON.stringify(data) ?? String(data)
  } catch {
    return String(data)
  }
}
