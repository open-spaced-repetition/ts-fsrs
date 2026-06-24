import { describe, expect, expectTypeOf, it } from 'vitest'
import { SRSSchemaError } from '@/schema/index.js'
import {
  type Grade,
  gradeSchema,
  grades,
  Rating,
  type Rating as RatingValue,
  ratingSchema,
  ratings,
} from './rating.js'

describe('Rating', () => {
  it('defines fixed rating values and schema', () => {
    expect(ratings).toEqual([0, 1, 2, 3, 4])
    expect(grades).toEqual([1, 2, 3, 4])
    expect(Rating).toEqual({
      Manual: 0,
      Again: 1,
      Hard: 2,
      Good: 3,
      Easy: 4,
    })

    expect(ratingSchema.parse(Rating.Manual)).toBe(Rating.Manual)
    expect(ratingSchema.parse(Rating.Good)).toBe(Rating.Good)
    expect(() => ratingSchema.parse(5)).toThrow(SRSSchemaError)
    expect(gradeSchema.parse(Rating.Good)).toBe(Rating.Good)
    expect(() => gradeSchema.parse(Rating.Manual)).toThrow(SRSSchemaError)
    expectTypeOf<RatingValue>().toEqualTypeOf<0 | 1 | 2 | 3 | 4>()
    expectTypeOf<Grade>().toEqualTypeOf<1 | 2 | 3 | 4>()
  })

  it('prevents mutation of Rating', () => {
    expect(() => {
      ;(Rating as Record<string, unknown>).Again = 99
    }).toThrow(TypeError)
    expect(() => {
      ;(Rating as Record<string, unknown>).Custom = 5
    }).toThrow(TypeError)
  })

  it('prevents mutation of ratings', () => {
    expect(() => {
      ;(ratings as unknown as number[])[0] = 99
    }).toThrow(TypeError)
    expect(() => {
      ;(ratings as unknown as number[]).push(5)
    }).toThrow(TypeError)
  })

  it('prevents mutation of grades', () => {
    expect(() => {
      ;(grades as unknown as number[])[0] = 99
    }).toThrow(TypeError)
    expect(() => {
      ;(grades as unknown as number[]).push(5)
    }).toThrow(TypeError)
  })
})
