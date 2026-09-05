import {
  type Grade as KitGrade,
  Rating as KitRating,
  State as KitState,
  defineModel as kitDefineModel,
  gradeSchema as kitGradeSchema,
  ratingSchema as kitRatingSchema,
  stateSchema as kitStateSchema,
} from '@open-spaced-repetition/srs-kit'
import {
  defineModel,
  FSRSMemoryStateSchema,
  type Grade,
  gradeSchema,
  Rating,
  ratingSchema,
  State,
  stateSchema,
} from 'ts-fsrs'
import { FSRSMemoryStateSchema as internalFSRSMemoryStateSchema } from '@/kit/schema.js'

describe('srs-kit primitives', () => {
  it('re-exports model helpers and primitives from srs-kit', () => {
    expect(defineModel).toBe(kitDefineModel)
    expect(Rating).toBe(KitRating)
    expect(State).toBe(KitState)
    expect(gradeSchema).toBe(kitGradeSchema)
    expect(ratingSchema).toBe(kitRatingSchema)
    expect(stateSchema).toBe(kitStateSchema)
    expect(FSRSMemoryStateSchema).toBe(internalFSRSMemoryStateSchema)
    expectTypeOf<Grade>().toEqualTypeOf<KitGrade>()
  })
})
