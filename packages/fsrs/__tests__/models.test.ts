import {
  type Grade as KitGrade,
  gradeSchema as kitGradeSchema,
  Rating as KitRating,
  ratingSchema as kitRatingSchema,
  State as KitState,
  stateSchema as kitStateSchema,
} from '@open-spaced-repetition/srs-kit'
import {
  type Grade,
  gradeSchema,
  Rating,
  ratingSchema,
  State,
  stateSchema,
} from 'ts-fsrs'

describe('srs-kit primitives', () => {
  it('re-exports Rating, State, and Grade from srs-kit', () => {
    expect(Rating).toBe(KitRating)
    expect(State).toBe(KitState)
    expect(gradeSchema).toBe(kitGradeSchema)
    expect(ratingSchema).toBe(kitRatingSchema)
    expect(stateSchema).toBe(kitStateSchema)
    expectTypeOf<Grade>().toEqualTypeOf<KitGrade>()
  })
})
