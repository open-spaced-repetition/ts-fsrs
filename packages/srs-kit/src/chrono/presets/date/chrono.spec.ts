import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
  ChronoCardOf,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import { parse } from '@/schema/index.js'
import { dateChrono, dateConfigSchema, dateDiffInDays } from './index.js'

describe('dateChrono', () => {
  it('validates fractionalDays and defaults omitted configuration', () => {
    for (const input of [undefined, {}, { fractionalDays: undefined }]) {
      expect(dateConfigSchema.parse(input)).toEqual({ fractionalDays: false })
    }
    for (const fractionalDays of [false, true]) {
      expect(dateConfigSchema.parse({ fractionalDays })).toEqual({
        fractionalDays,
      })
    }
    for (const input of [
      null,
      'UTC',
      { fractionalDays: 1 },
      { fractionalDays: 'true' },
      { fractionalDays: null },
    ]) {
      expect(() => dateConfigSchema.parse(input)).toThrow()
    }
  })
  it('can preserve elapsed fractional days without changing the default', () => {
    const from = new Date('2026-06-20T23:59:00Z')
    const to = new Date('2026-06-21T00:01:00Z')
    const fractional = dateChrono.create({ config: { fractionalDays: true } })
    expect(fractional.difference(from, to)).toBe(2 / 1440)
    expect(fractional.difference(to, from)).toBe(-2 / 1440)
    expect(fractional.difference(from, from)).toBe(0)
    expect(fractional.add(from, 2 / 1440)).toEqual(to)
    expect(
      dateChrono
        .create({ config: { fractionalDays: false } })
        .difference(from, to)
    ).toBe(1)
    expect(
      dateChrono
        .create({ config: dateConfigSchema.parse(undefined) })
        .difference(from, to)
    ).toBe(1)
  })
  it('provides a Date adapter with due and last-review fields', () => {
    expectTypeOf<ChronoTimeOf<typeof dateChrono>>().toEqualTypeOf<Date>()
    expectTypeOf<ChronoCardOf<typeof dateChrono>>().toEqualTypeOf<{
      dueAt: Date
      lastReviewAt: Date | null
    }>()
    expectTypeOf<ChronoRevlogOf<typeof dateChrono>>().toEqualTypeOf<{
      dueAt: Date
      reviewTime: Date
    }>()

    const now = new Date('2026-06-20T00:00:00.000Z')
    const later = new Date('2026-06-21T12:00:00.000Z')
    const epoch = new Date(0)
    const {
      add,
      compare,
      difference,
      now: getCurrent,
    } = dateChrono.create({ config: dateConfigSchema.parse(undefined) })
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
        dueAt: now,
        reviewTime: later,
      })
    ).toEqual({ dueAt: now, reviewTime: later })
    expect(() =>
      parse(dateChrono.schema.revlog, {
        dueAt: null,
        reviewTime: later,
      })
    ).toThrow('Expected valid Date fields')
    expect(() =>
      parse(dateChrono.schema.revlog, {
        dueAt: later,
      })
    ).toThrow('Expected valid Date fields')
    expect(() =>
      parse(dateChrono.schema.revlog, {
        dueAt: epoch,
        reviewTime: later,
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
    ).toEqual({ previous: now, current: later })
    expect(
      parse(dateChrono.projection, {
        card: parse(dateChrono.schema.card, {
          dueAt: now,
          lastReviewAt: null,
        }),
        time: later,
      })
    ).toEqual({ previous: now, current: later })
    expect(
      parse(dateChrono.projection, {
        card: parse(dateChrono.schema.card, {
          dueAt: now,
        }),
        time: later,
      })
    ).toEqual({ previous: now, current: later })
    expect(
      parse(dateChrono.projection, {
        revlog: {
          dueAt: now,
          reviewTime: later,
        },
      })
    ).toEqual({ previous: now, current: later })
    expect(dateChrono.projection['~standard'].validate(123)).toEqual({
      issues: [{ message: 'Expected valid Date fields' }],
    })
    expect(() => parse(dateChrono.projection, 123)).toThrow(
      'Expected valid Date fields'
    )
    expect(() =>
      parse(dateChrono.projection, {
        revlog: {
          dueAt: now,
        },
      })
    ).toThrow('Expected valid Date fields')
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
    expect(compare!(now, later)).toBe(-1)
    expect(compare!(later, now)).toBe(1)
    expect(compare!(later, later)).toBe(0)
    expect(
      compare!(
        new Date('2026-06-20T00:01:00.000Z'),
        new Date('2026-06-20T23:59:00.000Z')
      )
    ).toBe(-1)
    expect(add(now, 2.25)).toEqual(new Date('2026-06-22T06:00:00.000Z'))
    expect(
      dateChrono.defaultValue.card!({
        config: { fractionalDays: false },
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: now, lastReviewAt: later })
    expect(
      dateChrono.defaultValue.card!({
        config: { fractionalDays: false },
        time: now,
      })
    ).toEqual({ dueAt: now, lastReviewAt: null })
    expect(
      dateChrono.defaultValue.revlog!({
        config: { fractionalDays: false },
        time: now,
        previous: {
          previous: now,
          current: later,
        },
      })
    ).toEqual({ dueAt: now, reviewTime: later })
    expect(
      dateChrono.defaultValue.revlog!({
        config: { fractionalDays: false },
        time: now,
      })
    ).toEqual({ dueAt: now, reviewTime: now })
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
