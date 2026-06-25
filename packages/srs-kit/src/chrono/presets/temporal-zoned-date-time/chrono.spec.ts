import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ChronoCardOf,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import { parse } from '@/schema/index.js'
import { temporalZonedDateTimeChrono } from './index.js'

const NS_PER_DAY = 86_400_000_000_000n

function restoreTemporal(descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) {
    Object.defineProperty(globalThis, 'Temporal', descriptor)
    return
  }

  Reflect.deleteProperty(globalThis, 'Temporal')
}

function createZonedDateTime(epochNanoseconds: bigint): Temporal.ZonedDateTime {
  const TemporalZonedDateTime = globalThis.Temporal?.ZonedDateTime

  if (TemporalZonedDateTime === undefined) {
    throw new ReferenceError('Temporal.ZonedDateTime is not available')
  }

  return new TemporalZonedDateTime(epochNanoseconds, 'Asia/Shanghai')
}

describe('temporalZonedDateTimeChrono', () => {
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
        temporalZonedDateTimeChrono.create({
          config: { fractionalDays: false, timezone: 'UTC' },
        })
      ).toThrow('Temporal.ZonedDateTime is not available')
      expect(() => parse(temporalZonedDateTimeChrono.schema.time, {})).toThrow(
        'Temporal.ZonedDateTime is not available'
      )
    } finally {
      restoreTemporal(originalTemporal)
    }
  })

  it('provides a Temporal.ZonedDateTime adapter', () => {
    expectTypeOf<
      ChronoTimeOf<typeof temporalZonedDateTimeChrono>
    >().toEqualTypeOf<Temporal.ZonedDateTime>()
    expectTypeOf<
      ChronoCardOf<typeof temporalZonedDateTimeChrono>
    >().toEqualTypeOf<{
      dueAt: Temporal.ZonedDateTime
      lastReviewAt: Temporal.ZonedDateTime
    }>()
    expectTypeOf<
      ChronoRevlogOf<typeof temporalZonedDateTimeChrono>
    >().toEqualTypeOf<{
      dueAt: Temporal.ZonedDateTime
      lastReviewAt: Temporal.ZonedDateTime
    }>()

    const now = createZonedDateTime(0n)
    const later = createZonedDateTime((NS_PER_DAY * 3n) / 2n)
    const temporalConfig = parse(temporalZonedDateTimeChrono.schema.config, {})
    const { add, difference } = temporalZonedDateTimeChrono.create({
      config: temporalConfig,
    })

    expect(parse(temporalZonedDateTimeChrono.schema.time, now)).toBe(now)
    expect(() => parse(temporalZonedDateTimeChrono.schema.time, {})).toThrow(
      'Expected Temporal.ZonedDateTime'
    )
    expect(parse(temporalZonedDateTimeChrono.schema.config, {})).toEqual({
      fractionalDays: false,
      timezone: 'UTC',
    })
    expect(
      parse(temporalZonedDateTimeChrono.schema.config, {
        timezone: 'Asia/Shanghai',
      })
    ).toEqual({
      fractionalDays: false,
      timezone: 'Asia/Shanghai',
    })
    expect(() =>
      parse(temporalZonedDateTimeChrono.schema.config, {
        timezone: null,
      })
    ).toThrow('Expected timezone to be a string')
    expect(
      parse(temporalZonedDateTimeChrono.schema.card, {
        dueAt: now,
        lastReviewAt: null,
      })
    ).toEqual({ dueAt: now, lastReviewAt: now })
    expect(
      parse(temporalZonedDateTimeChrono.schema.card, {
        dueAt: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: now })
    expect(
      parse(temporalZonedDateTimeChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: now,
      })
    ).toEqual({ dueAt: later, lastReviewAt: now })
    expect(() =>
      parse(temporalZonedDateTimeChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: null,
      })
    ).toThrow('Expected Temporal.ZonedDateTime fields')
    expect(
      parse(temporalZonedDateTimeChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: now,
        },
        time: later,
      })
    ).toEqual({ previous: now, current: later })
    expect(
      parse(temporalZonedDateTimeChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: null,
        },
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(() => parse(temporalZonedDateTimeChrono.schema.card, null)).toThrow()
    expect(() =>
      parse(temporalZonedDateTimeChrono.schema.card, {
        dueAt: {},
        lastReviewAt: null,
      })
    ).toThrow()
    expect(() =>
      parse(temporalZonedDateTimeChrono.schema.card, {
        dueAt: now,
        lastReviewAt: {},
      })
    ).toThrow()
    expect(difference(now, later)).toBe(1)
    expect(difference(later, later)).toBe(0)
    const { difference: fractionalDifference } =
      temporalZonedDateTimeChrono.create({
        config: parse(temporalZonedDateTimeChrono.schema.config, {
          fractionalDays: true,
        }),
      })
    expect(fractionalDifference(now, later)).toBe(1.5)
    expect(add(now, 2).epochNanoseconds).toBe(NS_PER_DAY * 2n)
    expect(add(now, -0.25).epochNanoseconds).toBe(-NS_PER_DAY / 4n)
    expect(add(now, 2.25).epochNanoseconds).toBe((NS_PER_DAY * 9n) / 4n)
    const { add: addInShanghai } = temporalZonedDateTimeChrono.create({
      config: parse(temporalZonedDateTimeChrono.schema.config, {
        timezone: 'Asia/Shanghai',
      }),
    })
    expect(addInShanghai(now, 1).timeZoneId).toBe('Asia/Shanghai')
    expect(
      temporalZonedDateTimeChrono.defaultValue.card!({
        config: temporalConfig,
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: now, lastReviewAt: later })
    expect(
      temporalZonedDateTimeChrono.defaultValue.card!({
        config: temporalConfig,
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      temporalZonedDateTimeChrono.defaultValue.revlog!({
        config: temporalConfig,
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: later, lastReviewAt: now })
    expect(
      temporalZonedDateTimeChrono.defaultValue.revlog!({
        config: temporalConfig,
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: now })
  })
})
