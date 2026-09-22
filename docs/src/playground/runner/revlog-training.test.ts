import { describe, expect, it, vi } from 'vitest'
import { trainRevlogCsv } from './revlog-training'

const HEADER = 'review_time,card_id,review_rating,review_duration,review_state'
const options = {
  enableShortTerm: true,
  nextDayStartsAt: 4,
  timezone: 'UTC',
} as const

describe('revlog.csv training', () => {
  it.each(['FSRS-6', 'FSRS-7'] as const)(
    'trains %s and returns its complete weights array',
    async (modelVersion) => {
      const csvText = [
        HEADER,
        '1704067200000,card-one,3,1000,0',
        '1704153600000,card-one,4,900,2',
      ].join('\n')

      const onProgress = vi.fn()
      const result = await trainRevlogCsv(csvText, {
        ...options,
        modelVersion,
        onProgress,
      })

      expect(result.itemCount).toBe(1)
      expect(result.weights).toHaveLength(modelVersion === 'FSRS-6' ? 21 : 34)
      expect(result.weights.every(Number.isFinite)).toBe(true)
      if (modelVersion === 'FSRS-6')
        expect(result.weights[0]).toBeCloseTo(0.212, 6)
      expect(onProgress.mock.calls.length).toBeLessThanOrEqual(101)
      expect(onProgress.mock.lastCall?.[0]).toBe(onProgress.mock.lastCall?.[1])
    }
  )

  it('accepts CRLF records and quoted card ids containing commas and quotes', async () => {
    const csvText = [
      HEADER,
      '1704067200000,"card ""alpha"", one",3,1000,0',
      '1704153600000,"card ""alpha"", one",4,900,2',
    ].join('\r\n')

    const result = await trainRevlogCsv(csvText, options)

    expect(result.itemCount).toBe(1)
    expect(result.weights).toHaveLength(34)
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

  it('preserves FSRS7 same-day items while FSRS6 keeps its day-based filter', async () => {
    const csvText = [
      HEADER,
      '1704067200000,one,3,1000,0',
      '1704070800000,one,4,900,2',
    ].join('\n')
    const result = await trainRevlogCsv(csvText, options)
    expect(result.itemCount).toBe(1)
    expect(result.weights).toHaveLength(34)
    await expect(
      trainRevlogCsv(csvText, { ...options, modelVersion: 'FSRS-6' })
    ).rejects.toThrow('No valid review was found')
  })

  it('FSRS6 rejects CSV data with no review on a later study day', async () => {
    const csvText = [
      HEADER,
      '1704067200000,one,3,1000,0',
      '1704070800000,one,4,900,2',
    ].join('\n')

    await expect(
      trainRevlogCsv(csvText, { ...options, modelVersion: 'FSRS-6' })
    ).rejects.toThrow('No valid review was found')
  })
})

// Initialization of a non-trivial FSRS7 dataset still needs interday observations.
it('reports insufficient FSRS7 initialization data when every interval is under a day', async () => {
  const rows = [HEADER]
  for (let card = 0; card < 16; card++) {
    rows.push(`1704067200000,${card},3,1000,0`, `1704070800000,${card},4,900,2`)
  }
  await expect(
    trainRevlogCsv(rows.join('\n'), { ...options, modelVersion: 'FSRS-7' })
  ).rejects.toThrow('NotEnoughData')
})
