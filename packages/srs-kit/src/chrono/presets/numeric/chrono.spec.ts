import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ChronoCardOf,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import { parse } from '@/schema/index.js'
import { numericChrono } from './index.js'

describe('numericChrono', () => {
  it('provides a numeric chrono over number time values', () => {
    expectTypeOf<ChronoTimeOf<typeof numericChrono>>().toEqualTypeOf<number>()
    expectTypeOf<ChronoCardOf<typeof numericChrono>>().toEqualTypeOf<never>()
    expectTypeOf<ChronoRevlogOf<typeof numericChrono>>().toEqualTypeOf<never>()
    const { time } = numericChrono.schema
    expect(parse(time, 3.75)).toBe(3.75)
    expect(() => parse(time, Number.NaN)).toThrow('Expected finite number')
    expect(() => parse(time, '3.75')).toThrow('Expected finite number')
    expect('config' in numericChrono.schema).toBe(false)
    expect('card' in numericChrono.schema).toBe(false)
    expect('revlog' in numericChrono.schema).toBe(false)
    expect(parse(numericChrono.projection, { card: {}, time: 4.5 })).toEqual({
      previous: 0,
      current: 4.5,
    })
    expect(parse(numericChrono.projection, { time: 4.5 })).toEqual({
      previous: 0,
      current: 4.5,
    })
    expect(
      parse(numericChrono.projection, {
        card: { current: 4.5 },
        time: 4.5,
      })
    ).toEqual({ previous: 0, current: 4.5 })

    const { add, difference, now } = numericChrono.create()

    expect(now()).toBe(0)
    expect(difference(0, 4.5)).toBe(4.5)
    expect(difference(1.25, 4.5)).toBe(3.25)
    expect(add(4.5, 2.25)).toBe(6.75)
    expect('card' in numericChrono.defaultValue).toBe(false)
    expect('revlog' in numericChrono.defaultValue).toBe(false)

    // Test the projection
    const projectionValue = parse(numericChrono.projection, {
      card: {},
      time: 4.5,
    })
    expect(projectionValue).toEqual({ previous: 0, current: 4.5 })
    const elapsed = difference(
      projectionValue.previous,
      projectionValue.current
    )
    expect(elapsed).toBe(4.5)
  })
})
