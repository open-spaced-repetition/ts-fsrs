import { describe, expect, expectTypeOf, it } from 'vitest'
import { Rating } from '@/primitives/index.js'
import type { SchemaOutput } from '@/schema/index.js'
import type { ModelBounds } from './model.js'
import {
  SM2_DEFAULT_WEIGHTS,
  SM2_MODEL_BOUNDS,
  type SM2Config,
  SM2Model,
  type SM2State,
} from './sm2.test.js'

const core = SM2Model.create({ config: { weights: SM2_DEFAULT_WEIGHTS } })

describe('SM2Model', () => {
  it('preserves model definition types', () => {
    expectTypeOf(SM2Model.name).toEqualTypeOf<'sm2'>()
    expectTypeOf<
      SchemaOutput<typeof SM2Model.schema.config>
    >().toEqualTypeOf<SM2Config>()
    expectTypeOf<
      SchemaOutput<typeof SM2Model.schema.memoryState>
    >().toEqualTypeOf<SM2State>()
    expectTypeOf<ModelBounds<SM2State>>().toEqualTypeOf<{
      readonly iMin: number
      readonly iMax: number
      readonly eMin: number
      readonly eMax: number
      readonly rMin: number
      readonly rMax: number
    }>()
    expectTypeOf<ReturnType<typeof SM2Model.create>['bounds']>().toExtend<
      ModelBounds<SM2State>
    >()
    expectTypeOf<
      ReturnType<typeof SM2Model.create>['config']
    >().toEqualTypeOf<SM2Config>()
  })

  it('initializes with first interval and default ease factor', () => {
    const state = core.step({
      memoryState: null,
      rating: Rating.Good,
      elapsedDays: 0,
    })
    expect(state).toEqual({
      interval: SM2_DEFAULT_WEIGHTS[0],
      easeFactor: expect.any(Number),
      reps: 1,
    })
  })

  it('uses second interval on second successful review', () => {
    const first = core.step({
      memoryState: null,
      rating: Rating.Good,
      elapsedDays: 0,
    })
    const second = core.step({
      memoryState: first,
      rating: Rating.Good,
      elapsedDays: 1,
    })
    expect(second.interval).toBe(SM2_DEFAULT_WEIGHTS[1])
    expect(second.reps).toBe(2)
  })

  it('multiplies interval by ease factor from third review onward', () => {
    const first = core.step({
      memoryState: null,
      rating: Rating.Good,
      elapsedDays: 0,
    })
    const second = core.step({
      memoryState: first,
      rating: Rating.Good,
      elapsedDays: 1,
    })
    const third = core.step({
      memoryState: second,
      rating: Rating.Good,
      elapsedDays: 6,
    })
    expect(third.interval).toBe(second.interval * second.easeFactor)
    expect(third.reps).toBe(3)
  })

  it('resets reps to 1 on Again', () => {
    const first = core.step({
      memoryState: null,
      rating: Rating.Good,
      elapsedDays: 0,
    })
    const second = core.step({
      memoryState: first,
      rating: Rating.Good,
      elapsedDays: 1,
    })
    const lapse = core.step({
      memoryState: second,
      rating: Rating.Again,
      elapsedDays: 6,
    })
    expect(lapse.reps).toBe(1)
    expect(lapse.interval).toBe(SM2_DEFAULT_WEIGHTS[0])
  })

  it('clamps ease factor within bounds', () => {
    let state = core.step({
      memoryState: null,
      rating: Rating.Again,
      elapsedDays: 0,
    })
    for (let i = 0; i < 50; i++) {
      state = core.step({
        memoryState: state,
        rating: Rating.Again,
        elapsedDays: 0,
      })
    }
    expect(state.easeFactor).toBe(SM2_MODEL_BOUNDS.eMin)
  })

  it('clamps interval within bounds', () => {
    let state = core.step({
      memoryState: null,
      rating: Rating.Easy,
      elapsedDays: 0,
    })
    for (let i = 0; i < 100; i++) {
      state = core.step({
        memoryState: state,
        rating: Rating.Easy,
        elapsedDays: state.interval,
      })
    }
    expect(state.interval).toBeLessThanOrEqual(SM2_MODEL_BOUNDS.iMax)
  })

  it('computes forgetting curve as 0.9^(t/interval)', () => {
    const state = { interval: 10, easeFactor: 2.5, reps: 3 }
    expect(core.forgettingCurve(state, 10)).toBeCloseTo(0.9, 8)
    expect(core.forgettingCurve(state, 0)).toBeCloseTo(1.0, 8)
  })

  it('computes next interval from desired retention', () => {
    const state = { interval: 10, easeFactor: 2.5, reps: 3 }
    expect(core.nextInterval(state, 0.9)).toBe(10)
  })

  it('replays history via forward', () => {
    const states = core.forward({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Good, deltaT: 1 },
        { rating: Rating.Good, deltaT: 6 },
      ],
    })
    expect(states).toHaveLength(3)
    expect(states[0].reps).toBe(1)
    expect(states[1].reps).toBe(2)
    expect(states[2].reps).toBe(3)

    const manual = core.step({
      memoryState: core.step({
        memoryState: core.step({
          memoryState: null,
          rating: Rating.Good,
          elapsedDays: 0,
        }),
        rating: Rating.Good,
        elapsedDays: 1,
      }),
      rating: Rating.Good,
      elapsedDays: 6,
    })
    expect(states[2]).toEqual(manual)
  })

  it('validates config schema', () => {
    expect(() =>
      SM2Model.create({ config: { weights: [1, 2, 3] } as never })
    ).toThrow()
  })

  it('provides correct default memory state', () => {
    const config = { weights: SM2_DEFAULT_WEIGHTS }
    const defaultState = SM2Model.defaultValue.memoryState({ config })
    expect(defaultState).toEqual({
      interval: 0,
      easeFactor: SM2_DEFAULT_WEIGHTS[2],
      reps: 0,
    })
  })
})
