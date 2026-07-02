import { describe, expect, expectTypeOf, it } from 'vitest'
import type { SM2State } from '@/model/sm2.test.js'
import {
  getParsedCardMemoryState,
  rememberParsedCardMemoryState,
} from './compose-schema.js'

describe('parsed card memory state', () => {
  it('falls back to unknown record for unmarked cards', () => {
    const memoryState = getParsedCardMemoryState({})

    expectTypeOf(memoryState).toEqualTypeOf<
      Record<string, unknown> | undefined
    >()
    expect(memoryState).toBeUndefined()
  })

  it('infers remembered memory state type from the card', () => {
    const inputMemoryState: SM2State = {
      interval: 1,
      easeFactor: 2.5,
      reps: 3,
    }
    const remembered = rememberParsedCardMemoryState(
      { source: 'fixture' },
      inputMemoryState
    )
    const memoryState = getParsedCardMemoryState(remembered)

    expectTypeOf(memoryState).toEqualTypeOf<SM2State | undefined>()
    expect(memoryState).toEqual({
      interval: 1,
      easeFactor: 2.5,
      reps: 3,
    })
  })
})
