import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ChronoCardOf,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import { parse } from '@/schema/index.js'
import { temporalInstantChrono } from './index.js'

const NS_PER_DAY = 86_400_000_000_000n

function createInstant(epochNanoseconds: bigint): Temporal.Instant {
  return Temporal.Instant.fromEpochNanoseconds(epochNanoseconds)
}

function restoreTemporal(descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) {
    Object.defineProperty(globalThis, 'Temporal', descriptor)
    return
  }

  Reflect.deleteProperty(globalThis, 'Temporal')
}

describe('temporalInstantChrono', () => {
  it('fails at concrete runtime boundaries when Temporal is unavailable', () => {
    const originalTemporal = Object.getOwnPropertyDescriptor(
      globalThis,
      'Temporal'
    )

    Object.defineProperty(globalThis, 'Temporal', {
      configurable: true,
      value: undefined,
    })

    try {
      expect(() =>
        temporalInstantChrono.create({
          config: { fractionalDays: false, timezone: 'UTC' },
        })
      ).toThrow('Temporal.Instant is not available')
      expect(() => parse(temporalInstantChrono.schema.time, {})).toThrow(
        'Temporal.Instant is not available'
      )
    } finally {
      restoreTemporal(originalTemporal)
    }
  })

  it('provides a Temporal.Instant adapter', () => {
    expectTypeOf<
      ChronoTimeOf<typeof temporalInstantChrono>
    >().toEqualTypeOf<Temporal.Instant>()
    expectTypeOf<ChronoCardOf<typeof temporalInstantChrono>>().toEqualTypeOf<{
      dueAt: Temporal.Instant
      lastReviewAt: Temporal.Instant | null
    }>()
    expectTypeOf<ChronoRevlogOf<typeof temporalInstantChrono>>().toEqualTypeOf<{
      dueAt: Temporal.Instant
      lastReviewAt: Temporal.Instant
    }>()

    const now = createInstant(0n)
    const later = createInstant((NS_PER_DAY * 3n) / 2n)
    const temporalConfig = parse(temporalInstantChrono.schema.config, {
      timezone: 'Asia/Shanghai',
    })
    const {
      add,
      difference,
      now: getCurrent,
    } = temporalInstantChrono.create({
      config: temporalConfig,
    })
    const current = getCurrent()

    expect(current).toBeInstanceOf(Temporal.Instant)
    expect(parse(temporalInstantChrono.schema.time, now)).toBe(now)
    expect(() => parse(temporalInstantChrono.schema.time, {})).toThrow(
      'Expected Temporal.Instant'
    )
    expect(parse(temporalInstantChrono.schema.config, {})).toEqual({
      fractionalDays: false,
      timezone: 'UTC',
    })
    expect(() => parse(temporalInstantChrono.schema.config, null)).toThrow(
      'Expected temporal instant config'
    )
    expect(() =>
      parse(temporalInstantChrono.schema.config, {
        timezone: 9,
      })
    ).toThrow('Expected timezone to be a string')
    expect(() =>
      parse(temporalInstantChrono.schema.config, {
        fractionalDays: 'yes',
      })
    ).toThrow('Expected fractionalDays to be a boolean')
    expect(
      parse(temporalInstantChrono.schema.config, {
        timezone: 'Asia/Shanghai',
      })
    ).toEqual({
      fractionalDays: false,
      timezone: 'Asia/Shanghai',
    })
    expect(
      parse(temporalInstantChrono.schema.config, {
        timezone: '+09:00',
      })
    ).toEqual({
      fractionalDays: false,
      timezone: '+09:00',
    })
    expect(
      parse(temporalInstantChrono.schema.config, {
        timezone: 'Etc/GMT-9',
      })
    ).toEqual({
      fractionalDays: false,
      timezone: 'Etc/GMT-9',
    })
    expect(() =>
      parse(temporalInstantChrono.schema.config, {
        timezone: 'bad/timezone',
      })
    ).toThrow('Expected valid timezone')
    expect(
      parse(temporalInstantChrono.schema.card, {
        dueAt: now,
        lastReviewAt: null,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      parse(temporalInstantChrono.schema.card, {
        dueAt: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      parse(temporalInstantChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: now,
      })
    ).toEqual({ dueAt: later, lastReviewAt: now })
    expect(() =>
      parse(temporalInstantChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: null,
      })
    ).toThrow('Expected Temporal.Instant fields')
    expect(() =>
      parse(temporalInstantChrono.schema.revlog, {
        dueAt: later,
      })
    ).toThrow('Expected Temporal.Instant fields')
    expect(() =>
      parse(temporalInstantChrono.schema.revlog, {
        dueAt: {},
        lastReviewAt: now,
      })
    ).toThrow('Expected Temporal.Instant fields')
    expect(
      parse(temporalInstantChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: now,
        },
        time: later,
      })
    ).toEqual({ previous: now, current: later })
    expect(
      parse(temporalInstantChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: null,
        },
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(
      parse(temporalInstantChrono.projection, {
        card: parse(temporalInstantChrono.schema.card, {
          dueAt: now,
          lastReviewAt: null,
        }),
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(
      parse(temporalInstantChrono.projection, {
        card: parse(temporalInstantChrono.schema.card, {
          dueAt: now,
        }),
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(() =>
      parse(temporalInstantChrono.projection, {
        card: null,
        time: later,
      })
    ).toThrow('Expected Temporal.Instant fields')
    expect(() =>
      parse(temporalInstantChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: now,
        },
        time: {},
      })
    ).toThrow('Expected Temporal.Instant')
    expect(() => parse(temporalInstantChrono.schema.card, null)).toThrow()
    expect(() =>
      parse(temporalInstantChrono.schema.card, {
        dueAt: {},
        lastReviewAt: null,
      })
    ).toThrow()
    expect(() =>
      parse(temporalInstantChrono.schema.card, {
        dueAt: now,
        lastReviewAt: {},
      })
    ).toThrow()
    expect(difference(now, later)).toBe(1)
    expect(difference(later, later)).toBe(0)
    const { difference: fractionalDifference } = temporalInstantChrono.create({
      config: parse(temporalInstantChrono.schema.config, {
        fractionalDays: true,
        timezone: 'Asia/Shanghai',
      }),
    })
    expect(fractionalDifference(now, later)).toBe(1.5)
    expect(add(now, 2).epochNanoseconds).toBe(NS_PER_DAY * 2n)
    expect(add(now, -0.25).epochNanoseconds).toBe(-NS_PER_DAY / 4n)
    expect(add(now, 2.25).epochNanoseconds).toBe((NS_PER_DAY * 9n) / 4n)
    const { add: addInUtc, difference: utcDifference } =
      temporalInstantChrono.create({
        config: parse(temporalInstantChrono.schema.config, {
          timezone: 'UTC',
        }),
      })
    expect(
      utcDifference(
        createInstant(-NS_PER_DAY / 4n),
        createInstant(NS_PER_DAY / 4n)
      )
    ).toBe(1)
    expect(addInUtc(now, 2).epochNanoseconds).toBe(NS_PER_DAY * 2n)
    expect(addInUtc(now, -0.25).epochNanoseconds).toBe(-NS_PER_DAY / 4n)
    expect(addInUtc(now, 2.25).epochNanoseconds).toBe((NS_PER_DAY * 9n) / 4n)
    expect(
      temporalInstantChrono.defaultValue.card!({
        config: temporalConfig,
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: now, lastReviewAt: later })
    expect(
      temporalInstantChrono.defaultValue.card!({
        config: temporalConfig,
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      temporalInstantChrono.defaultValue.revlog!({
        config: temporalConfig,
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: later, lastReviewAt: now })
    expect(
      temporalInstantChrono.defaultValue.revlog!({
        config: temporalConfig,
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: now })
  })
})
