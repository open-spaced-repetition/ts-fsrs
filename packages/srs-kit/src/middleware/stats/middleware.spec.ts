import { describe, expect, it } from 'vitest'
import type { Grade } from '@/primitives/rating.js'
import { Rating } from '@/primitives/rating.js'
import { State } from '@/primitives/state.js'
import { schedulerStatsMiddleware } from './middleware.js'

type ReviewHandler = NonNullable<
  NonNullable<typeof schedulerStatsMiddleware.handlers>['review']
>

type RollbackHandler = NonNullable<
  NonNullable<typeof schedulerStatsMiddleware.handlers>['rollback']
>

type ReviewContext = Parameters<ReviewHandler>[0]
type RollbackContext = Parameters<RollbackHandler>[0]

function reviewContext({
  grade = Rating.Good,
  state = State.Learning,
  reps = 1,
  lapses = 0,
}: {
  readonly grade?: Grade
  readonly state?: State
  readonly reps?: number
  readonly lapses?: number
} = {}): ReviewContext {
  return {
    config: { chrono: 0 },
    input: {
      card: { reps, lapses, state, scheduleStatus: 'review' },
      grade,
      now: 0,
    },
    desiredRetention: 0.9,
    elapsedDays: 1,
    scheduledDays: undefined,
    candidate: {
      step: () => ({}),
      nextInterval: () => 1,
    },
    result: {
      card: {},
      revlog: {},
    },
  }
}

function rollbackContext({
  rating = Rating.Good,
  state = State.Learning,
  reps = 1,
  lapses = 0,
}: {
  readonly rating?: Grade
  readonly state?: State
  readonly reps?: number
  readonly lapses?: number
} = {}): RollbackContext {
  return {
    config: { chrono: 0 },
    input: {
      card: { reps, lapses, state, scheduleStatus: 'review' },
      revlog: { state, rating, scheduleStatus: 'review' },
    },
    result: {
      card: {},
    },
  }
}

describe('schedulerStatsMiddleware', () => {
  it('provides default stats fields', () => {
    expect(
      schedulerStatsMiddleware.defaultValue?.card?.({ config: { chrono: 0 } })
    ).toEqual({
      reps: 0,
      lapses: 0,
    })
  })

  it('increments reps without a lapse for non-review again ratings', () => {
    const ctx = reviewContext({ reps: 2, lapses: 1 })

    schedulerStatsMiddleware.handlers?.review?.(ctx, () => {
      ctx.result.card.state = State.Review
    })

    expect(ctx.result.card.reps).toBe(3)
    expect(ctx.result.card.lapses).toBe(1)
  })

  it('increments lapses when review cards are rated again', () => {
    const ctx = reviewContext({
      grade: Rating.Again,
      state: State.Review,
      reps: 2,
      lapses: 1,
    })

    schedulerStatsMiddleware.handlers?.review?.(ctx, () => {})

    expect(ctx.result.card.reps).toBe(3)
    expect(ctx.result.card.lapses).toBe(2)
  })

  it('rolls back reps and non-lapse reviews without going below zero', () => {
    const ctx = rollbackContext({ reps: 0, lapses: 0 })

    schedulerStatsMiddleware.handlers?.rollback?.(ctx, () => {})

    expect(ctx.result.card.reps).toBe(0)
    expect(ctx.result.card.lapses).toBe(0)
  })

  it('rolls back lapse counts for review again revlogs', () => {
    const ctx = rollbackContext({
      rating: Rating.Again,
      state: State.Review,
      reps: 3,
      lapses: 2,
    })

    schedulerStatsMiddleware.handlers?.rollback?.(ctx, () => {})

    expect(ctx.result.card.reps).toBe(2)
    expect(ctx.result.card.lapses).toBe(1)
  })
})
