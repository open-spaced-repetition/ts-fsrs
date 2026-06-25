import { defineSchema } from '@/schema/index.js'

export const Rating = Object.freeze({
  Manual: 0,
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const)

export const ratings = Object.freeze([
  Rating.Manual,
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const)

export type Rating = (typeof ratings)[number]

export const grades = Object.freeze([
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const)

export type Grade = (typeof grades)[number]

export const ratingSchema = defineSchema<Rating>((value) =>
  value === Rating.Manual ||
  value === Rating.Again ||
  value === Rating.Hard ||
  value === Rating.Good ||
  value === Rating.Easy
    ? { value }
    : { issues: [{ message: 'Expected rating' }] }
)

export const gradeSchema = defineSchema<Grade>((value) =>
  value === Rating.Again ||
  value === Rating.Hard ||
  value === Rating.Good ||
  value === Rating.Easy
    ? { value }
    : { issues: [{ message: 'Expected grade' }] }
)
