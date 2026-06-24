import { describe, expect, expectTypeOf, it } from 'vitest'
import { parse, SRSSchemaError } from '@/schema/index.js'
import {
  State,
  type State as StateValue,
  stateSchema,
  states,
} from './state.js'

describe('State', () => {
  it('defines fixed state values and schema', () => {
    expect(states).toEqual([0, 1, 2, 3])
    expect(State).toEqual({
      New: 0,
      Learning: 1,
      Review: 2,
      Relearning: 3,
    })

    expect(parse(stateSchema, State.Review)).toBe(State.Review)
    expect(() => parse(stateSchema, 4)).toThrow(SRSSchemaError)
    expectTypeOf<StateValue>().toEqualTypeOf<0 | 1 | 2 | 3>()
  })

  it('prevents mutation of State', () => {
    expect(() => {
      ;(State as Record<string, unknown>).New = 99
    }).toThrow(TypeError)
    expect(() => {
      ;(State as Record<string, unknown>).Custom = 4
    }).toThrow(TypeError)
  })

  it('prevents mutation of states', () => {
    expect(() => {
      ;(states as unknown as number[])[0] = 99
    }).toThrow(TypeError)
    expect(() => {
      ;(states as unknown as number[]).push(4)
    }).toThrow(TypeError)
  })
})
