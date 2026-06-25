import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ChronoCardOf,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import { parse } from '@/schema/index.js'
import { temporalInstantChrono } from './index.js'

const NS_PER_DAY = 86_400_000_000_000n

class FakeDuration {
  constructor(readonly days: number) {}

  total(options: { readonly unit: 'day' }): number {
    if (options.unit !== 'day') {
      throw new RangeError('Only day totals are supported')
    }

    return this.days
  }
}

class FakePlainDate {
  constructor(private readonly epochDay: number) {}

  until(other: FakePlainDate): FakeDuration {
    return new FakeDuration(other.epochDay - this.epochDay)
  }
}

class FakeZonedDateTime {
  readonly epochNanoseconds: bigint
  readonly timezone: string

  constructor(epochNanoseconds: bigint, timezone: string) {
    this.epochNanoseconds = epochNanoseconds
    this.timezone = timezone
  }

  until(other: FakeZonedDateTime): FakeDuration {
    return new FakeDuration(
      Number(other.epochNanoseconds - this.epochNanoseconds) /
        Number(NS_PER_DAY)
    )
  }

  add(duration: { readonly days?: number }): FakeZonedDateTime {
    return new FakeZonedDateTime(
      this.epochNanoseconds +
        BigInt(Math.round((duration.days ?? 0) * Number(NS_PER_DAY))),
      this.timezone
    )
  }

  toInstant(): FakeInstant {
    return new FakeInstant(this.epochNanoseconds)
  }

  toPlainDate(): FakePlainDate {
    return new FakePlainDate(
      Math.floor(Number(this.epochNanoseconds) / Number(NS_PER_DAY))
    )
  }
}

class FakeInstant {
  readonly epochNanoseconds: bigint
  private lastTimezone: string | null = null

  constructor(epochNanoseconds: bigint) {
    this.epochNanoseconds = epochNanoseconds
  }

  get epochMilliseconds(): number {
    return Number(this.epochNanoseconds / 1_000_000n)
  }

  static fromEpochNanoseconds(epochNanoseconds: bigint): FakeInstant {
    return new FakeInstant(epochNanoseconds)
  }

  toZonedDateTimeISO(timezone: string): FakeZonedDateTime {
    this.lastTimezone = timezone

    return new FakeZonedDateTime(this.epochNanoseconds, timezone)
  }

  getLastTimezone(): string | null {
    return this.lastTimezone
  }
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

  it('provides a Temporal.Instant adapter when Temporal is available', () => {
    const originalTemporal = Object.getOwnPropertyDescriptor(
      globalThis,
      'Temporal'
    )

    Object.defineProperty(globalThis, 'Temporal', {
      configurable: true,
      value: {
        Instant: FakeInstant,
      },
    })

    try {
      expectTypeOf<
        ChronoTimeOf<typeof temporalInstantChrono>
      >().toEqualTypeOf<Temporal.Instant>()
      expectTypeOf<ChronoCardOf<typeof temporalInstantChrono>>().toEqualTypeOf<{
        dueAt: Temporal.Instant
        lastReviewAt: Temporal.Instant
      }>()
      expectTypeOf<
        ChronoRevlogOf<typeof temporalInstantChrono>
      >().toEqualTypeOf<{
        dueAt: Temporal.Instant
        lastReviewAt: Temporal.Instant
      }>()

      const nowFake = new FakeInstant(0n)
      const now = nowFake as unknown as Temporal.Instant
      const later = new FakeInstant(
        (NS_PER_DAY * 3n) / 2n
      ) as unknown as Temporal.Instant
      const temporalConfig = parse(temporalInstantChrono.schema.config, {
        timezone: 'Asia/Shanghai',
      })
      const { add, difference } = temporalInstantChrono.create({
        config: temporalConfig,
      })

      expect(parse(temporalInstantChrono.schema.time, now)).toBe(now)
      expect(() => parse(temporalInstantChrono.schema.time, {})).toThrow(
        'Expected Temporal.Instant'
      )
      expect(parse(temporalInstantChrono.schema.config, {})).toEqual({
        fractionalDays: false,
        timezone: 'UTC',
      })
      expect(
        parse(temporalInstantChrono.schema.card, {
          dueAt: now,
          lastReviewAt: null,
        })
      ).toEqual({ dueAt: now, lastReviewAt: now })
      expect(
        parse(temporalInstantChrono.schema.card, {
          dueAt: now,
        })
      ).toEqual({ dueAt: now, lastReviewAt: now })
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
      expect(nowFake.getLastTimezone()).toBe('Asia/Shanghai')
      expect(difference(later, later)).toBe(0)
      const { difference: fractionalDifference } = temporalInstantChrono.create(
        {
          config: parse(temporalInstantChrono.schema.config, {
            fractionalDays: true,
            timezone: 'Asia/Shanghai',
          }),
        }
      )
      expect(fractionalDifference(now, later)).toBe(1.5)
      expect(add(now, 2).epochNanoseconds).toBe(NS_PER_DAY * 2n)
      expect(add(now, -0.25).epochNanoseconds).toBe(-NS_PER_DAY / 4n)
      expect(add(now, 2.25).epochNanoseconds).toBe((NS_PER_DAY * 9n) / 4n)
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
    } finally {
      restoreTemporal(originalTemporal)
    }
  })
})
