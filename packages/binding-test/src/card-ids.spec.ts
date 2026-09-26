import {
  computeParameters,
  convertCsvToFsrsItems,
  convertCsvToFsrsItemsWithCardIds,
  evaluateWithTimeSeriesSplits,
  FSRSBinding,
  FSRSBindingItem,
  FSRSBindingReview,
  type FSRSItemsWithCardIds,
} from '@open-spaced-repetition/binding'
import { describe, expect, expectTypeOf, test, vi } from 'vitest'

const day = 86400000
const start = 1700000000000
const header = 'card_id,review_time,review_rating,review_state,review_duration'
const ids = [
  '01',
  '1',
  '9007199254740992',
  '9007199254740993',
  'card "alpha", one',
]
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
const csv = Buffer.from(
  [
    header,
    `!discarded,${start},3,2,1000`,
    ...[0, 1, 2].flatMap((review) =>
      ids.map(
        (id, index) =>
          `${quote(id)},${start + review * day + (ids.length - index) * 1000},${(index % 4) + 1},${review === 0 ? 0 : 2},1000`
      )
    ),
    `1,${start + day / 2},0,0,1000`,
  ].join('\n')
)

function streamOf(data: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data.slice(0, 31))
      controller.enqueue(data.slice(31))
      controller.close()
    },
  })
}

function trainingData(version: 'FSRS-6' | 'FSRS-7') {
  const rows = [header]
  for (let card = 0; card < 40; card++) {
    for (let review = 0; review < 7; review++) {
      rows.push(
        `${card},${start + review * day + card * 1000},${review > 1 && (card + review) % 5 === 0 ? 1 : 3},${review === 0 ? 0 : 2},1000`
      )
    }
  }
  return convertCsvToFsrsItemsWithCardIds(
    Buffer.from(rows.join('\n')),
    4,
    0,
    version
  )
}

describe('numeric card IDs', () => {
  test.each(['FSRS-6', 'FSRS-7'] as const)(
    'remaps exact CSV identifiers once and keeps %s output aligned',
    async (version) => {
      const result = convertCsvToFsrsItemsWithCardIds(csv, 4, 0, version)
      expectTypeOf(result).toEqualTypeOf<FSRSItemsWithCardIds>()
      expect(result.items.map((item) => item.toString())).toEqual(
        convertCsvToFsrsItems(csv, 4, 0, version).map((item) => item.toString())
      )
      // The IDs are assigned to retained card groups, then follow global timestamp order.
      expect(result.cardIds).toEqual([4, 3, 2, 1, 0, 4, 3, 2, 1, 0])
      const stream = streamOf(csv)
      const promise = convertCsvToFsrsItemsWithCardIds(stream, 4, 0, version)
      expectTypeOf(promise).toEqualTypeOf<Promise<FSRSItemsWithCardIds>>()
      const streamed = await promise
      expect(streamed.cardIds).toEqual(result.cardIds)
      expect(streamed.items.map((item) => item.toString())).toEqual(
        result.items.map((item) => item.toString())
      )
      expect(stream.locked).toBe(false)
    }
  )

  test('returns empty items and IDs when no history is retained', () => {
    expect(convertCsvToFsrsItemsWithCardIds(Buffer.from(header), 4, 0)).toEqual(
      { items: [], cardIds: [] }
    )
  })

  test.each(['FSRS-6', 'FSRS-7'] as const)(
    'preserves %s evaluation metrics with card IDs',
    async (version) => {
      const { items, cardIds } = trainingData(version)
      const model = new FSRSBinding(
        await computeParameters([], {
          enableShortTerm: true,
          modelVersion: version,
        })
      )
      const before = model.evaluate(items)
      const after = model.evaluate(items, cardIds)
      expect(after.logLoss).toBe(before.logLoss)
      expect(after.rmseBins).toBeCloseTo(before.rmseBins, 6)
    }
  )

  test('trains and evaluates time-series splits with the same normalized IDs', async () => {
    const { items, cardIds } = trainingData('FSRS-7')
    const options = {
      enableShortTerm: true,
      modelVersion: 'FSRS-7' as const,
      cardIds,
    }
    const weights = await computeParameters(items, options)
    expect(weights).toHaveLength(34)
    expect(weights.every(Number.isFinite)).toBe(true)
    const metrics = await evaluateWithTimeSeriesSplits(items, options)
    expect(Number.isFinite(metrics.logLoss)).toBe(true)
    expect(Number.isFinite(metrics.rmseBins)).toBe(true)
  })

  test('validates ID alignment before progress polling', async () => {
    const item = new FSRSBindingItem([
      new FSRSBindingReview(3, 0),
      new FSRSBindingReview(3, 1),
    ])
    const model = new FSRSBinding()
    for (const cardIds of [[], [0, 1]]) {
      const progress = vi.fn()
      expect(() => model.evaluate([item], cardIds)).toThrow(/cardIds/)
      const options = { enableShortTerm: true, cardIds, progress }
      const training = computeParameters([item], options)
      const evaluation = evaluateWithTimeSeriesSplits([item], options)
      await Promise.all([
        expect(training).rejects.toThrow(/cardIds/),
        expect(evaluation).rejects.toThrow(/cardIds/),
      ])
      expect(progress).not.toHaveBeenCalled()
    }
  })
})
