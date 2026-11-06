import {
  __napiBindingTarget,
  FSRSBinding,
} from '@open-spaced-repetition/binding-wasm32-wasip1'
import type { ModelReview } from 'ts-fsrs'
import { dateChrono, defineScheduler } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model as TS6 } from 'ts-fsrs/models/fsrs-6'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model as TS7 } from 'ts-fsrs/models/fsrs-7'
import { Reschedule } from 'ts-fsrs/reschedule'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { FSRS6Model, FSRS7Model } from './index.js'

const config6 = {
  weights: FSRS6_DEFAULT_WEIGHTS,
  enableShortTerm: true,
  numRelearningSteps: 0,
}
const config7 = { weights: FSRS7_DEFAULT_WEIGHTS }
const history: ModelReview[] = [
  { deltaT: 0, rating: 1 },
  { deltaT: 0, rating: 3 },
  { deltaT: 1, rating: 2 },
  { deltaT: 3, rating: 4 },
  { deltaT: 10, rating: 1 },
  { deltaT: 0, rating: 3 },
  { deltaT: 21, rating: 3 },
]

function closePacked(actual: Float64Array, index: number, expected: object) {
  const offsets: Record<string, number> = {
    stability: 0,
    difficulty: 1,
    stabilityFast: 2,
  }
  for (const [key, value] of Object.entries(expected)) {
    expect(
      Math.abs(actual[index * 3 + offsets[key]] - value) /
        Math.max(1, Math.abs(value))
    ).toBeLessThan(0.00005)
  }
}

describe('WASIP1 model', () => {
  it('loads the real threadless artifact', () => {
    expect(__napiBindingTarget).toBe('wasm32-wasip1')
  })
  it.each([
    [FSRS6Model.create({ config: config6 }), TS6.create({ config: config6 })],
    [FSRS7Model.create({ config: config7 }), TS7.create({ config: config7 })],
  ])(
    'replays all states, resumes, and computes curves and intervals in WASM',
    (model, reference) => {
      const states = model.forward({ history })
      const expected = reference.forward({ history })
      expect(states).toBeInstanceOf(Float64Array)
      expect(states).toHaveLength(history.length * 3)
      expected.forEach((state, i) => {
        closePacked(states, i, state)
      })
      const initialState = {
        stability: states[6],
        difficulty: states[7],
        stabilityFast: states[8],
      }
      expect(
        model.forward({ history: [], initialState: initialState as never })
      ).toHaveLength(0)
      expect(
        model.forward({
          history: history.slice(3),
          initialState: initialState as never,
        })
      ).toEqual(states.slice(9))
      let state = null
      const { step } = model
      for (let i = 0; i < history.length; i++) {
        state = step({
          memoryState: state,
          elapsedDays: history[i].deltaT,
          rating: history[i].rating,
        } as never)
        expect(state.stability).toBe(states[i * 3])
        expect(state.difficulty).toBe(states[i * 3 + 1])
        if ('stabilityFast' in state)
          expect(state.stabilityFast).toBe(states[i * 3 + 2])
      }
      expect(model.forward({ history: [] })).toHaveLength(0)
      expect(model.nextInterval(initialState as never, 0.9)).toBeCloseTo(
        reference.nextInterval(initialState as never, 0.9),
        3
      )
      expect(model.forgettingCurve(initialState as never, 3)).toBeCloseTo(
        reference.forgettingCurve(initialState as never, 3),
        5
      )
      const override = {
        memoryState: initialState,
        elapsedDays: 3,
        rating: 3,
        retrievability: 0.8,
      }
      expect(model.step(override as never)).toEqual(
        model.step({ ...override, retrievability: undefined } as never)
      )
    }
  )
  it('keeps FSRS-7 fractional days in WASM', () => {
    const model = FSRS7Model.create({ config: config7 })
    const reference = TS7.create({ config: config7 })
    const fractional = history.map((r, i) => ({ ...r, deltaT: i / 17 }))
    const states = model.forward({ history: fractional })
    reference.forward({ history: fractional }).forEach((s, i) => {
      closePacked(states, i, s)
    })
  })
  it('explicitly rejects unsupported FSRS-6 options', () => {
    expect(() =>
      FSRS6Model.create({ config: { ...config6, enableShortTerm: false } })
    ).toThrow('enableShortTerm')
    const model = FSRS6Model.create({ config: config6 })
    expect(model.forward({ history: [{ deltaT: 0.1, rating: 3 }] })).toEqual(
      model.forward({ history: [{ deltaT: 0, rating: 3 }] })
    )
  })
  it('integrates with a SRS Kit scheduler and its zero-state new card', () => {
    const scheduler = defineScheduler({
      model: FSRS7Model,
      chrono: dateChrono,
    }).create({ config: config7 })
    const now = new Date('2026-01-01T00:00:00Z')
    const first = scheduler.review({
      card: scheduler.newCard({ now }),
      now,
      grade: 3,
    })
    expect(
      scheduler.review({
        card: first.card,
        now: new Date(now.getTime() + 86400000),
        grade: 3,
      }).card.stability
    ).toBeGreaterThan(0)
    const model = FSRS7Model.create({ config: config7 })
    expect(
      scheduler.model.step({
        memoryState: { stability: 0, difficulty: 0, stabilityFast: 0 },
        rating: 3,
        elapsedDays: 0,
      })
    ).toEqual(model.step({ memoryState: null, rating: 3, elapsedDays: 0 }))
  })
  it('preserves the packed buffer in Reschedule and reads only its final state', () => {
    const scheduler = defineScheduler({
      model: FSRS7Model,
      chrono: dateChrono,
    }).create({ config: config7 })
    const forward = vi.spyOn(scheduler.model, 'forward')
    const result = new Reschedule(scheduler).replay({
      history: [
        { rating: 3, reviewTime: new Date('2026-01-01T00:00:00Z') },
        { rating: 4, reviewTime: new Date('2026-01-03T00:00:00Z') },
      ],
    })
    expectTypeOf(result.memoryStates).toEqualTypeOf<Float64Array>()
    expectTypeOf(result.memoryState).toEqualTypeOf<Float64Array>()
    expect(result.memoryStates).toBe(forward.mock.results[0].value)
    expect(result.memoryState).toEqual(result.memoryStates.subarray(3))
    expect(result.memoryState.buffer).toBe(result.memoryStates.buffer)
    expect(result.memoryState.byteOffset).toBe(
      result.memoryStates.byteOffset + 3 * Float64Array.BYTES_PER_ELEMENT
    )
    result.memoryState[0] = 42
    expect(result.memoryStates[3]).toBe(42)
  })
  it('uses the fsrs-rs FSRS-6 stability floor, including after repeated failures', () => {
    const model = FSRS6Model.create({ config: config6 })
    const state = {
      stability: 0.0010230820626020432,
      difficulty: 9.977883338928223,
    }
    const input = { memoryState: state, elapsedDays: 0, rating: 1 as const }
    expect(model.bounds.sMin).toBe(0.0001)
    expect(model.step(input).stability).toBeLessThan(0.001)
    expect(TS6.create({ config: config6 }).step(input).stability).toBe(0.001)
  })
  it('batches independent cards without losing intermediate states', () => {
    const binding = new FSRSBinding(FSRS7_DEFAULT_WEIGHTS)
    const history = new Float64Array([0, 1, 1, 3, 0, 4, 0.1, 2])
    const expected = [
      ...binding.forward(history.slice(0, 4)),
      ...binding.forward(history.slice(4)),
    ]
    expect([
      ...binding.forwardBatch(history, new Uint32Array([0, 2, 2, 4])),
    ]).toEqual(expected)
    const withCurve = binding.forwardBatch(
      history,
      new Uint32Array([0, 2, 4]),
      true
    )
    expect(withCurve).toHaveLength(16)
    expect(withCurve[3]).toBe(0)
    expect(withCurve[11]).toBe(0)
    for (const i of [0, 2]) {
      expect(withCurve[i * 4 + 7]).toBe(
        binding.currentRetrievability(
          {
            stability: withCurve[i * 4],
            difficulty: withCurve[i * 4 + 1],
            stabilityFast: withCurve[i * 4 + 2],
          },
          history[(i + 1) * 2]
        )
      )
    }
    expect(
      binding.forwardBatch(new Float64Array(), new Uint32Array([0]))
    ).toHaveLength(0)
    expect(() => binding.forward(new Float64Array([0]))).toThrow()
    for (const offsets of [[], [1, 4], [0, 5, 4], [0, 3]]) {
      expect(() =>
        binding.forwardBatch(history, new Uint32Array(offsets))
      ).toThrow()
    }
  })
})
