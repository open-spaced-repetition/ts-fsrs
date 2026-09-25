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
