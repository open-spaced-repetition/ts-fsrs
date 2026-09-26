import { describe, expect, expectTypeOf, it } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { defineMiddleware } from '@/middleware/index.js'
import type { SM2State } from '@/model/sm2.test.js'
import { SM2Model } from '@/model/sm2.test.js'
import { State } from '@/primitives/state.js'
import {
  getAttachedValue,
  rememberAttachedValue,
} from '@/schema/attached-value.js'
import { defineSchema } from '@/schema/index.js'
import { composeSchema, parsedCardMemoryStateSymbol } from './compose-schema.js'

describe('own __proto__ fields', () => {
  it('keeps setter protection when a core-field setter exposes the parsed card', () => {
    let setterCalls = 0
    Object.defineProperty(Object.prototype, 'state', {
      configurable: true,
      set(value: unknown) {
        Object.defineProperty(this, 'state', {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        })
        Object.defineProperty(this, 'guarded', {
          configurable: true,
          set() {
            setterCalls += 1
          },
        })
      },
    })
    try {
      const schema = composeSchema({
        model: SM2Model,
        chrono: numericChrono,
        middlewares: [
          defineMiddleware({
            name: 'guarded field',
            schema: {
              card: defineSchema<{ guarded: number }>(() => ({
                value: { guarded: 1 },
              })),
            },
          }),
        ],
      })
      const card = schema.card.parse({
        interval: 1,
        easeFactor: 2.5,
        reviewStep: 1,
        state: State.Review,
        scheduleStatus: 'review',
      })
      expect(setterCalls).toBe(0)
      expect(Object.getPrototypeOf(card)).toBe(Object.prototype)
      expect(Object.getOwnPropertyDescriptor(card, 'guarded')).toEqual({
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    } finally {
      Reflect.deleteProperty(Object.prototype, 'state')
    }
  })

  it('preserves the first card-init schema output as data', () => {
    const firstFields = JSON.parse('{"__proto__":{"polluted":true}}') as Record<
      PropertyKey,
      unknown
    >
    const symbol = Symbol('input')
    firstFields[symbol] = 'kept'
    const first = defineMiddleware({
      name: 'first',
      schema: {
        cardInitInput: defineSchema<Record<string, unknown>>(() => ({
          value: firstFields,
        })),
      },
    })
    const second = defineMiddleware({
      name: 'second',
      schema: {
        cardInitInput: defineSchema<Record<string, unknown>>(() => ({
          value: { extra: true },
        })),
      },
    })
    const schema = composeSchema({
      model: SM2Model,
      chrono: numericChrono,
      middlewares: [first, second],
    })

    const { input } = schema.cardInitInput.parse({})

    expect(Object.getPrototypeOf(input)).toBe(Object.prototype)
    expect(Object.hasOwn(input, '__proto__')).toBe(true)
    expect(input.polluted).toBeUndefined()
    expect(input.extra).toBe(true)
    expect(Object.getOwnPropertyDescriptor(input, symbol)?.value).toBe('kept')
  })

  it('preserves the model memory-state output as data on a parsed card', () => {
    const fields = JSON.parse('{"__proto__":{"polluted":true}}') as Record<
      string,
      unknown
    >
    const memoryState = defineSchema<SM2State>((value) => ({
      value: { ...SM2Model.schema.memoryState.parse(value), ...fields },
    }))
    const schema = composeSchema({
      model: {
        ...SM2Model,
        schema: { ...SM2Model.schema, memoryState },
      },
      chrono: numericChrono,
      middlewares: [],
    })

    const card = schema.card.parse({
      interval: 1,
      easeFactor: 2.5,
      reviewStep: 1,
      state: State.Review,
      scheduleStatus: 'review',
    })

    expect(Object.getPrototypeOf(card)).toBe(Object.prototype)
    expect(Object.hasOwn(card, '__proto__')).toBe(true)
    expect(card.polluted).toBeUndefined()
  })
})

it('allows revlog middleware to override writable non-configurable model fields', () => {
  const memoryState = defineSchema<SM2State>((value) => ({
    value: Object.defineProperty(
      SM2Model.schema.memoryState.parse(value),
      'interval',
      {
        writable: true,
        configurable: false,
      }
    ),
  }))
  const schema = composeSchema({
    model: { ...SM2Model, schema: { ...SM2Model.schema, memoryState } },
    chrono: numericChrono,
    middlewares: [
      defineMiddleware({
        name: 'override-interval',
        schema: {
          revlog: defineSchema<{ interval: number }>(() => ({
            value: { interval: 2 },
          })),
        },
      }),
    ],
  })
  const revlog = schema.revlog.parse({
    interval: 1,
    easeFactor: 2.5,
    reviewStep: 1,
    state: State.Review,
    scheduleStatus: 'review',
    rating: 3,
  })
  expect(Object.getOwnPropertyDescriptor(revlog, 'interval')).toEqual({
    value: 2,
    writable: true,
    enumerable: true,
    configurable: false,
  })
})

describe('parsed card memory state', () => {
  it('falls back to unknown record for unmarked cards', () => {
    const memoryState = getAttachedValue<
      typeof parsedCardMemoryStateSymbol,
      Record<string, unknown>
    >({}, parsedCardMemoryStateSymbol)

    expectTypeOf(memoryState).toEqualTypeOf<
      Record<string, unknown> | undefined
    >()
    expect(memoryState).toBeUndefined()
  })

  it('infers remembered memory state type from the card', () => {
    const inputMemoryState: SM2State = {
      interval: 1,
      easeFactor: 2.5,
      reviewStep: 3,
    }
    const remembered = rememberAttachedValue(
      { source: 'fixture' },
      parsedCardMemoryStateSymbol,
      inputMemoryState
    )
    const memoryState = getAttachedValue<
      typeof parsedCardMemoryStateSymbol,
      SM2State
    >(remembered, parsedCardMemoryStateSymbol)

    expectTypeOf(memoryState).toEqualTypeOf<SM2State | undefined>()
    expect(memoryState).toEqual({
      interval: 1,
      easeFactor: 2.5,
      reviewStep: 3,
    })
  })
})
