import type { StandardSchemaV1 } from '@standard-schema/spec'
import * as z from 'zod/mini'

export {
  type Grade,
  grades,
  Rating,
  ratings,
} from './rating-values.js'

import type { Grade, Rating as RatingValue } from './rating-values.js'
import { grades, ratings } from './rating-values.js'

export const ratingSchema = z.literal(ratings) satisfies StandardSchemaV1<
  RatingValue,
  RatingValue
>

export const gradeSchema = z.literal(grades) satisfies StandardSchemaV1<
  Grade,
  Grade
>
