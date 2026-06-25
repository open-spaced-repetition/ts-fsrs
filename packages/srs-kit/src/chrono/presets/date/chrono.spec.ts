import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ChronoCardOf,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import { parse } from '@/schema/index.js'
import { dateChrono, dateDiffInDays } from './index.js'

describe('dateChrono', () => {
  it('provides a Date adapter with due and last-review fields', () => {
    expectTypeOf<ChronoTimeOf<typeof dateChrono>>().toEqualTypeOf<Date>()
    expectTypeOf<ChronoCardOf<typeof dateChrono>>().toEqualTypeOf<{
      dueAt: Date
      lastReviewAt: Date | null
    }>()
    expectTypeOf<ChronoRevlogOf<typeof dateChrono>>().toEqualTypeOf<{
      dueAt: Date
      lastReviewAt: Date
    }>()

    const now = new Date('2026-06-20T00:00:00.000Z')
    const later = new Date('2026-06-21T12:00:00.000Z')
    const epoch = new Date(0)
    const { add, difference, now: getCurrent } = dateChrono.create()
    const current = getCurrent()

    expect(current).toBeInstanceOf(Date)
    expect(parse(dateChrono.schema.time, now)).toBe(now)
    expect(() => parse(dateChrono.schema.time, epoch)).toThrow(
      'Expected valid Date'
    )
    expect(() => parse(dateChrono.schema.time, new Date(Number.NaN))).toThrow(
      'Expected valid Date'
    )
    expect(() => parse(dateChrono.schema.time, 'now')).toThrow(
      'Expected valid Date'
    )
    expect(
      parse(dateChrono.schema.card, {
        dueAt: now,
        lastReviewAt: null,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      parse(dateChrono.schema.card, {
        dueAt: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(() =>
      parse(dateChrono.schema.card, {
        dueAt: now,
        lastReviewAt: epoch,
      })
    ).toThrow('Expected valid Date fields')
    expect(
      parse(dateChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: now,
      })
    ).toEqual({ dueAt: later, lastReviewAt: now })
    expect(() =>
      parse(dateChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: null,
      })
    ).toThrow('Expected valid Date fields')
    expect(() =>
      parse(dateChrono.schema.revlog, {
        dueAt: later,
      })
    ).toThrow('Expected valid Date fields')
    expect(() =>
      parse(dateChrono.schema.revlog, {
        dueAt: later,
        lastReviewAt: epoch,
      })
    ).toThrow('Expected valid Date fields')
    expect(
      parse(dateChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: now,
        },
        time: later,
      })
    ).toEqual({ previous: now, current: later })
    expect(
      parse(dateChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: null,
        },
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(
      parse(dateChrono.projection, {
        card: parse(dateChrono.schema.card, {
          dueAt: now,
          lastReviewAt: null,
        }),
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(
      parse(dateChrono.projection, {
        card: parse(dateChrono.schema.card, {
          dueAt: now,
        }),
        time: later,
      })
    ).toEqual({ previous: later, current: later })
    expect(() =>
      parse(dateChrono.projection, {
        card: null,
        time: later,
      })
    ).toThrow('Expected valid Date fields')
    expect(() =>
      parse(dateChrono.projection, {
        card: {
          dueAt: now,
          lastReviewAt: now,
        },
        time: 'later',
      })
    ).toThrow('Expected valid Date')
    expect(() => parse(dateChrono.schema.card, null)).toThrow()
    expect(() =>
      parse(dateChrono.schema.card, {
        dueAt: new Date(Number.NaN),
        lastReviewAt: null,
      })
    ).toThrow()
    expect(() =>
      parse(dateChrono.schema.card, {
        dueAt: epoch,
        lastReviewAt: null,
      })
    ).toThrow('Expected valid Date fields')
    expect(() =>
      parse(dateChrono.schema.card, {
        dueAt: now,
        lastReviewAt: new Date(Number.NaN),
      })
    ).toThrow()
    expect(() =>
      parse(dateChrono.schema.card, {
        dueAt: now,
        lastReviewAt: 'never',
      })
    ).toThrow()
    expect(difference(now, later)).toBe(1)
    expect(
      difference(
        new Date('2026-06-20T23:59:00.000Z'),
        new Date('2026-06-21T00:01:00.000Z')
      )
    ).toBe(1)
    expect(
      difference(
        new Date('2026-06-20T00:01:00.000Z'),
        new Date('2026-06-20T23:59:00.000Z')
      )
    ).toBe(0)
    expect(difference(later, later)).toBe(0)
    expect(add(now, 2.25)).toEqual(new Date('2026-06-22T06:00:00.000Z'))
    expect(
      dateChrono.defaultValue.card!({
        config: {},
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: now, lastReviewAt: later })
    expect(
      dateChrono.defaultValue.card!({
        config: {},
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      dateChrono.defaultValue.revlog!({
        config: {},
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: later, lastReviewAt: now })
    expect(
      dateChrono.defaultValue.revlog!({
        config: {},
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: now })
  })

  it('compares only UTC calendar dates', () => {
    expect(
      dateDiffInDays(
        new Date('2026-06-20T23:59:00.000Z'),
        new Date('2026-06-21T00:01:00.000Z')
      )
    ).toBe(1)
    expect(
      dateDiffInDays(
        new Date('2026-06-20T00:01:00.000Z'),
        new Date('2026-06-20T23:59:00.000Z')
      )
    ).toBe(0)
  })
})
