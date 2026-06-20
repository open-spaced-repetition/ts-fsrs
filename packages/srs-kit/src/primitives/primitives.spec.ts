import { describe, expect, expectTypeOf, it } from 'vitest'
import { ModelSchemaError, validateSchema } from '../schema/index.js'
import {
  type Grade,
  gradeSchema,
  grades,
  Rating,
  type Rating as RatingValue,
  ratingSchema,
  ratings,
} from './rating.js'
import {
  State,
  type State as StateValue,
  stateSchema,
  states,
} from './state.js'

describe('primitives', () => {
  it('defines fixed rating values and schema', async () => {
    expect(ratings).toEqual([0, 1, 2, 3, 4])
    expect(grades).toEqual([1, 2, 3, 4])
    expect(Rating).toEqual({
      Manual: 0,
      Again: 1,
      Hard: 2,
      Good: 3,
      Easy: 4,
    })

    await expect(validateSchema(ratingSchema, Rating.Manual)).resolves.toBe(
      Rating.Manual
    )
    await expect(validateSchema(ratingSchema, Rating.Good)).resolves.toBe(
      Rating.Good
    )
    await expect(validateSchema(ratingSchema, 5)).rejects.toThrow(
      ModelSchemaError
    )
    await expect(validateSchema(gradeSchema, Rating.Good)).resolves.toBe(
      Rating.Good
    )
    await expect(validateSchema(gradeSchema, Rating.Manual)).rejects.toThrow(
      ModelSchemaError
    )
    expectTypeOf<RatingValue>().toEqualTypeOf<0 | 1 | 2 | 3 | 4>()
    expectTypeOf<Grade>().toEqualTypeOf<1 | 2 | 3 | 4>()
  })

  it('defines fixed state values and schema', async () => {
    expect(states).toEqual([0, 1, 2, 3])
    expect(State).toEqual({
      New: 0,
      Learning: 1,
      Review: 2,
      Relearning: 3,
    })

    await expect(validateSchema(stateSchema, State.Review)).resolves.toBe(
      State.Review
    )
    await expect(validateSchema(stateSchema, 4)).rejects.toThrow(
      ModelSchemaError
    )
    expectTypeOf<StateValue>().toEqualTypeOf<0 | 1 | 2 | 3>()
  })
})
