export const Rating = {
  Manual: 0,
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const

export type Rating = (typeof Rating)[keyof typeof Rating]

export const ratings = [
  Rating.Manual,
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const satisfies readonly Rating[]

export const grades = [
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const satisfies readonly Rating[]

export type Grade = (typeof grades)[number]
