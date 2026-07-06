import { describe, expect, expectTypeOf, it } from 'vitest'
import type { SM2State } from '@/model/sm2.test.js'
import {
  getAttachedValue,
  rememberAttachedValue,
} from '@/schema/attached-value.js'
import { parsedCardMemoryStateSymbol } from './compose-schema.js'

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
