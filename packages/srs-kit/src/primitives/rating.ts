import type { StandardSchemaV1 } from '@/schema/index.js'

export const Rating = Object.freeze({
  Manual: 0,
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const)

export type Rating = (typeof Rating)[keyof typeof Rating]

export const ratings = Object.freeze([
  Rating.Manual,
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const)

export const grades = Object.freeze([
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const)

export type Grade = (typeof grades)[number]

export const ratingSchema: StandardSchemaV1<Rating, Rating> = {
  '~standard': {
    version: 1,
    vendor: '@open-spaced-repetition/srs-kit',
    validate(value) {
      return value === Rating.Manual ||
        value === Rating.Again ||
        value === Rating.Hard ||
        value === Rating.Good ||
        value === Rating.Easy
        ? { value }
        : { issues: [{ message: 'Expected rating' }] }
    },
  },
}

export const gradeSchema: StandardSchemaV1<Grade, Grade> = {
  '~standard': {
    version: 1,
    vendor: '@open-spaced-repetition/srs-kit',
    validate(value) {
      return value === Rating.Again ||
        value === Rating.Hard ||
        value === Rating.Good ||
        value === Rating.Easy
        ? { value }
        : { issues: [{ message: 'Expected grade' }] }
    },
  },
}
