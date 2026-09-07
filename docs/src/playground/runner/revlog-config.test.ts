import { describe, expect, it } from 'vitest'
import {
  getRevlogTrainingConfigErrorMessage,
  getTimezoneOptions,
  validateRevlogTrainingConfig,
} from './revlog-config'

describe('revlog training configuration', () => {
  it.each([
    0, 4, 23,
  ])('accepts nextDayStartsAt=%i with an IANA timezone', (nextDayStartsAt) => {
    expect(
      validateRevlogTrainingConfig('America/New_York', nextDayStartsAt)
    ).toEqual({
      config: { nextDayStartsAt, timezone: 'America/New_York' },
      ok: true,
    })
  })

  it.each([
    -1,
    24,
    4.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects illegal nextDayStartsAt=%s', (nextDayStartsAt) => {
    expect(validateRevlogTrainingConfig('UTC', nextDayStartsAt)).toEqual({
      error: 'invalid-next-day-start',
      ok: false,
    })
  })

  it.each([
    '',
    'Mars/Base',
    '+01:00',
    '-0800',
  ])('rejects non-IANA timezone %j', (timezone) => {
    expect(validateRevlogTrainingConfig(timezone, 4)).toEqual({
      error: 'invalid-timezone',
      ok: false,
    })
  })

  it('normalizes a valid IANA timezone before it reaches the binding', () => {
    expect(validateRevlogTrainingConfig('  america/new_york  ', 4)).toEqual({
      config: { nextDayStartsAt: 4, timezone: 'America/New_York' },
      ok: true,
    })
  })

  it('provides readable validation messages', () => {
    expect(getRevlogTrainingConfigErrorMessage('invalid-timezone')).toBe(
      'timezone must be a valid IANA timezone name'
    )
    expect(getRevlogTrainingConfigErrorMessage('invalid-next-day-start')).toBe(
      'nextDayStartsAt must be an integer from 0 through 23'
    )
  })
})

describe('timezone choices', () => {
  it('keeps UTC and the browser timezone when supportedValuesOf omits them', () => {
    const options = getTimezoneOptions('Browser/Current', {
      supportedValuesOf: () => ['America/New_York', 'Asia/Tokyo'],
    })

    expect(options).toEqual([
      'UTC',
      'Browser/Current',
      'America/New_York',
      'Asia/Tokyo',
    ])
  })

  it('does not duplicate UTC or the browser timezone', () => {
    const options = getTimezoneOptions('Asia/Tokyo', {
      supportedValuesOf: () => ['UTC', 'Asia/Tokyo'],
    })

    expect(options).toEqual(['UTC', 'Asia/Tokyo'])
  })

  it('falls back to a free-form input when supportedValuesOf is unavailable', () => {
    expect(getTimezoneOptions('UTC', null)).toBeUndefined()
  })

  it('falls back to a free-form input when supportedValuesOf throws', () => {
    const options = getTimezoneOptions('UTC', {
      supportedValuesOf: () => {
        throw new Error('unsupported')
      },
    })

    expect(options).toBeUndefined()
  })
})
