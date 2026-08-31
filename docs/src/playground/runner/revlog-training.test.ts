import { describe, expect, it, vi } from 'vitest'
import { trainRevlogCsv } from './revlog-training'

const HEADER = 'review_time,card_id,review_rating,review_duration,review_state'
const options = {
  enableShortTerm: true,
  nextDayStartsAt: 4,
  timezone: 'UTC',
} as const

describe('revlog.csv training', () => {
  it('trains an inline fixture and returns the complete weights array', async () => {
    const csvText = [
      HEADER,
      '1704067200000,card-one,3,1000,0',
      '1704153600000,card-one,4,900,2',
    ].join('\n')

    const onProgress = vi.fn()
    const result = await trainRevlogCsv(csvText, { ...options, onProgress })

    expect(result.itemCount).toBe(1)
    expect(result.weights).toHaveLength(21)
    expect(result.weights).toEqual(
      expect.arrayContaining([0.21199999749660492])
    )
    expect(onProgress.mock.calls.length).toBeLessThanOrEqual(101)
    expect(onProgress.mock.lastCall?.[0]).toBe(onProgress.mock.lastCall?.[1])
  })

  it('accepts CRLF records and quoted card ids containing commas and quotes', async () => {
    const csvText = [
      HEADER,
      '1704067200000,"card ""alpha"", one",3,1000,0',
      '1704153600000,"card ""alpha"", one",4,900,2',
    ].join('\r\n')

    const result = await trainRevlogCsv(csvText, options)

    expect(result.itemCount).toBe(1)
    expect(result.weights).toHaveLength(21)
  })

  it('rejects a header that omits a required binding field', async () => {
    const csvText = [
      'review_time,card,review_rating,review_duration,review_state',
      '1704067200000,one,3,1000,0',
      '1704153600000,one,4,900,2',
    ].join('\n')

    await expect(trainRevlogCsv(csvText, options)).rejects.toThrow(
      /CSV deserialization error.*card_id/i
    )
  })

  it('rejects CSV data with no review on a later study day', async () => {
    const csvText = [
      HEADER,
      '1704067200000,one,3,1000,0',
      '1704070800000,one,4,900,2',
    ].join('\n')

    await expect(trainRevlogCsv(csvText, options)).rejects.toThrow(
      'No valid review was found'
    )
  })
})
