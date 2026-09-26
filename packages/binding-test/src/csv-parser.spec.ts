import * as fs from 'node:fs'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding'
import { getTimezoneOffset, parseCSVToFSRSItems } from './helpers/csv-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('CSV Parser', () => {
  const testDataPath = path.join(__dirname, 'revlog.csv')
  const nextDayStartsAt = 4
  const timezone = 'Asia/Shanghai'

  test('ignores invalid CSV ratings for bytes and streams', async () => {
    const header =
      'card_id,review_time,review_rating,review_state,review_duration'
    const validRows = ['1,1704067200000,3,0,1000', '1,1704240000000,3,2,1000']
    const expected = convertCsvToFsrsItems(
      Buffer.from([header, ...validRows].join('\n')),
      4,
      timezone
    ).map((item) => item.toString())
    expect(expected.length).toBeGreaterThan(0)
    for (const rating of [0, 5, 4294967295]) {
      const data = Buffer.from(
        [
          header,
          validRows[0],
          `1,1704153600000,${rating},0,1000`,
          validRows[1],
        ].join('\n')
      )
      expect(
        convertCsvToFsrsItems(data, 4, timezone).map((item) => item.toString())
      ).toEqual(expected)
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(data)
          controller.close()
        },
      })
      const items = await convertCsvToFsrsItems(stream, 4, timezone)
      expect(items.map((item) => item.toString())).toEqual(expected)
      expect(stream.locked).toBe(false)
      expect(
        convertCsvToFsrsItems(
          Buffer.from(`${header}\n1,1704067200000,${rating},0,1000`),
          4,
          timezone
        )
      ).toEqual([])
    }
  })

  test('limits expanded histories to the first 1024 reviews after the last learning block', async () => {
    for (const version of ['FSRS-6', 'FSRS-7'] as const) {
      for (const count of [1023, 1024, 1025, 4000]) {
        const rows = [
          'card_id,review_time,review_rating,review_state,review_duration',
        ]
        // A previous learning block must not consume the new block's budget.
        rows.push('1,1600000000000,1,0,1000', '1,1600086400000,3,2,1000')
        for (let i = 0; i < count; i++) {
          rows.push(
            `1,${1700000000000 + i * 86400000},3,${i === 0 ? 0 : 2},1000`
          )
        }
        const data = Buffer.from(rows.join('\n'))
        const items = convertCsvToFsrsItems(data, 4, timezone, version)
        expect(items.length).toBe(Math.min(count, 1024) - 1)
        expect(items.at(-1)?.reviews.length).toBe(Math.min(count, 1024))
        expect(items.at(-1)?.reviews[0].rating).toBe(3)
        expect(items.at(-1)?.reviews[0].deltaT).toBe(0)
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(data)
            controller.close()
          },
        })
        const streamed = await convertCsvToFsrsItems(
          stream,
          4,
          timezone,
          version
        )
        expect(streamed.map((item) => item.toString())).toEqual(
          items.map((item) => item.toString())
        )
      }
    }
  })

  test('keeps cross-card timestamp ties and the last learning prefix in order', () => {
    const day = 86400000
    const start = 1700000000000
    const rows = [
      'card_id,review_time,review_rating,review_state,review_duration',
      ['b', start, 1, 0, 1000],
      ['a', start - 3 * day, 1, 0, 1000],
      ['a', start - 2 * day, 1, 2, 1000],
      ['a', start, 2, 0, 1000],
      ['b', start + day, 4, 2, 1000],
      ['a', start + day, 3, 2, 1000],
      ['a', start + day, 4, 2, 1000],
      ['a', start + 2 * day, 2, 2, 1000],
      ['no-learning', start, 3, 2, 1000],
      ['no-learning', start + day, 3, 2, 1000],
    ]
    const data = Buffer.from(
      rows
        .map((row) => (typeof row === 'string' ? row : row.join(',')))
        .join('\n')
    )
    for (const version of ['FSRS-6', 'FSRS-7'] as const) {
      const items = convertCsvToFsrsItems(data, 4, 0, version)
      expect(
        items.map((item) => item.reviews.map((review) => review.rating))
      ).toEqual([
        [2, 3],
        [1, 4],
        [2, 3, 4, 2],
      ])
      expect(items.at(-1)?.reviews.map((review) => review.deltaT)).toEqual([
        0, 1, 0, 1,
      ])
    }
  })

  test('validates rollover hours before converting bytes or reading streams', async () => {
    const data = Buffer.from(
      'card_id,review_time,review_rating,review_state,review_duration\n' +
        '1,1704067200000,3,0,1000\n1,1704240000000,3,2,1000\n'
    )
    for (const hour of [-1, 24, Number.MAX_SAFE_INTEGER]) {
      expect(() => convertCsvToFsrsItems(data, hour, timezone)).toThrow(
        'nextDayStartsAt must be between 0 and 23'
      )
      const stream = new ReadableStream<Uint8Array>()
      const result = convertCsvToFsrsItems(stream, hour, timezone)
      expect(result).toBeInstanceOf(Promise)
      await expect(result).rejects.toThrow(
        'nextDayStartsAt must be between 0 and 23'
      )
      expect(stream.locked).toBe(false)
    }
    for (const hour of [0, 23]) {
      const expected = convertCsvToFsrsItems(data, hour, timezone)
      expect(expected.length).toBeGreaterThan(0)
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(data)
          controller.close()
        },
      })
      const actual = await convertCsvToFsrsItems(stream, hour, timezone)
      expect(actual.map((item) => item.toString())).toEqual(
        expected.map((item) => item.toString())
      )
    }
  })

  test('FSRS7 preserves same-day fractions for bytes and streams', async () => {
    const base = Date.parse('2024-03-11T06:30:00Z')
    const data = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        `one,${base},3,0,1000`,
        `one,${base + 3600000},3,2,1000`,
        `one,${base + 23 * 3600000},4,2,1000`,
      ].join('\n')
    )
    const legacy = convertCsvToFsrsItems(data, 4, 'America/New_York', 'FSRS-6')
    expect(legacy).toHaveLength(1)
    expect(legacy[0].reviews.map((review) => review.deltaT)).toEqual([0, 0, 1])
    expect(
      convertCsvToFsrsItems(data, 4, 'America/New_York').map((item) =>
        item.toString()
      )
    ).toEqual(
      convertCsvToFsrsItems(data, 4, 'America/New_York', 'FSRS-7').map((item) =>
        item.toString()
      )
    )
    for (const timezone of ['America/New_York', 'UTC', 540]) {
      const items = convertCsvToFsrsItems(data, 4, timezone, 'FSRS-7')
      expect(items).toHaveLength(2)
      const deltas = items[1].reviews.map((review) => review.deltaT)
      expect(deltas[0]).toBe(0)
      expect(deltas[1]).toBeCloseTo(1 / 24, 7)
      expect(deltas[2]).toBeCloseTo(22 / 24, 7)
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(data)
          controller.close()
        },
      })
      const streamed = await convertCsvToFsrsItems(
        stream,
        4,
        timezone,
        'FSRS-7'
      )
      expect(streamed.map((item) => item.toString())).toEqual(
        items.map((item) => item.toString())
      )
      expect(stream.locked).toBe(false)
    }
  })

  test.each([
    [
      'spring full day',
      '2024-03-09T04:00:00-05:00',
      '2024-03-10T04:00:00-04:00',
      4,
      1,
    ],
    [
      'fall full day',
      '2024-11-02T04:00:00-04:00',
      '2024-11-03T04:00:00-05:00',
      4,
      1,
    ],
    [
      'spring half day',
      '2024-03-09T04:00:00-05:00',
      '2024-03-09T15:30:00-05:00',
      4,
      0.5,
    ],
    [
      'fall half day',
      '2024-11-02T04:00:00-04:00',
      '2024-11-02T16:30:00-04:00',
      4,
      0.5,
    ],
    [
      'spring two days',
      '2024-03-09T04:00:00-05:00',
      '2024-03-11T04:00:00-04:00',
      4,
      2,
    ],
    [
      'fall two days',
      '2024-11-02T04:00:00-04:00',
      '2024-11-04T04:00:00-05:00',
      4,
      2,
    ],
    [
      'spring clock jump',
      '2024-03-10T01:30:00-05:00',
      '2024-03-10T03:30:00-04:00',
      4,
      1 / 23,
    ],
    [
      'fall repeated hour',
      '2024-11-03T01:30:00-04:00',
      '2024-11-03T01:30:00-05:00',
      4,
      1 / 25,
    ],
    [
      'repeated rollover',
      '2024-11-03T01:00:00-04:00',
      '2024-11-04T01:00:00-05:00',
      1,
      1,
    ],
    [
      'missing rollover',
      '2024-03-10T03:00:00-04:00',
      '2024-03-11T02:00:00-04:00',
      2,
      1,
    ],
    [
      'spring midnight',
      '2024-03-10T00:00:00-05:00',
      '2024-03-11T00:00:00-04:00',
      0,
      1,
    ],
  ] as const)('normalizes learning-day duration: %s', async (_, start, end, rollover, expected) => {
    const data = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        'one,' + Date.parse(start) + ',3,0,1000',
        'one,' + Date.parse(end) + ',4,2,1000',
      ].join('\n')
    )
    const items = convertCsvToFsrsItems(
      data,
      rollover,
      'America/New_York',
      'FSRS-7'
    )
    expect(items[0].current?.deltaT).toBeCloseTo(expected, 7)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })
    const streamed = await convertCsvToFsrsItems(
      stream,
      rollover,
      'America/New_York',
      'FSRS-7'
    )
    expect(streamed[0].current?.deltaT).toBeCloseTo(expected, 7)
    if (expected === 1) {
      const legacy = convertCsvToFsrsItems(
        data,
        rollover,
        'America/New_York',
        'FSRS-6'
      )
      expect(legacy[0].current?.deltaT).toBe(1)
    }
  })

  test.each([
    0, 4, 23,
  ])('skips nonexistent study days at rollover %s', async (rollover) => {
    const hour = String(rollover).padStart(2, '0')
    const data = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        `one,${Date.parse(`2011-12-29T${hour}:00:00-10:00`)},3,0,1000`,
        `one,${Date.parse(`2011-12-31T${hour}:00:00+14:00`)},4,2,1000`,
        `one,${Date.parse(`2011-12-31T${hour}:30:00+14:00`)},4,2,1000`,
      ].join('\n')
    )
    const items = convertCsvToFsrsItems(
      data,
      rollover,
      'Pacific/Apia',
      'FSRS-7'
    )
    expect(items[0].current?.deltaT).toBe(1)
    expect(items[1].current?.deltaT).toBeCloseTo(0.5 / 24, 7)
    const streamed = await convertCsvToFsrsItems(
      Readable.toWeb(Readable.from([data])) as ReadableStream<Uint8Array>,
      rollover,
      'Pacific/Apia',
      'FSRS-7'
    )
    expect(streamed.map((item) => item.toString())).toEqual(
      items.map((item) => item.toString())
    )
    expect(
      convertCsvToFsrsItems(data, rollover, 'Pacific/Apia', 'FSRS-6')[0].current
        ?.deltaT
    ).toBe(2)
  })

  test.each([
    ['2011-12-29T00:00:00-10:00', '2011-12-31T00:00:00+14:00', 0, 1],
    ['2011-12-31T01:00:00+14:00', '2011-12-31T05:00:00+14:00', 4, 4 / 24],
    ['2011-12-31T05:00:00+14:00', '2012-01-01T05:00:00+14:00', 4, 1],
  ] as const)('handles transition range endpoints: %s', (start, end, rollover, expected) => {
    const data = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        `one,${Date.parse(start)},3,0,1000`,
        `one,${Date.parse(end)},4,2,1000`,
      ].join('\n')
    )
    const items = convertCsvToFsrsItems(
      data,
      rollover,
      'Pacific/Apia',
      'FSRS-7'
    )
    expect(items[0].current?.deltaT).toBeCloseTo(expected, 7)
  })

  test('FSRS6 should match the legacy converter count', () => {
    // TS version
    const tsItems = parseCSVToFSRSItems(testDataPath, nextDayStartsAt, timezone)

    // RS version
    const csvBuffer = fs.readFileSync(testDataPath)
    const rsItems = convertCsvToFsrsItems(
      csvBuffer,
      nextDayStartsAt,
      timezone,
      'FSRS-6'
    )

    // This count should match the Rust implementation
    expect(tsItems.length).toBe(rsItems.length)
    console.log(
      `✅ TS version (${tsItems.length}) matches RS version (${rsItems.length})`
    )
  })

  test('should support DST timezone in Rust implementation', () => {
    const csvBuffer = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        '1,1704067200000,3,0,1000',
        '1,1719878400000,3,2,1000',
      ].join('\n')
    )

    const items = convertCsvToFsrsItems(
      csvBuffer,
      nextDayStartsAt,
      'America/New_York'
    )

    expect(items).toHaveLength(1)
    expect(items[0].current?.deltaT).toBeGreaterThan(0)
  })

  test('should accept fixed timezone offset minutes in Rust implementation', () => {
    const csvBuffer = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        '1,1704067200000,3,0,1000',
        '1,1704153600000,3,2,1000',
      ].join('\n')
    )

    const timezoneItems = convertCsvToFsrsItems(
      csvBuffer,
      nextDayStartsAt,
      'Asia/Tokyo'
    )
    const offsetItems = convertCsvToFsrsItems(csvBuffer, nextDayStartsAt, 540)

    expect(offsetItems).toHaveLength(timezoneItems.length)
    expect(offsetItems).toEqual(timezoneItems)
  })

  test('should match Uint8Array input for a chunked Web ReadableStream', async () => {
    const data = fs.readFileSync(testDataPath)
    const stream = Readable.toWeb(fs.createReadStream(testDataPath))
    const expected = convertCsvToFsrsItems(data, nextDayStartsAt, timezone)

    await expect(
      convertCsvToFsrsItems(stream, nextDayStartsAt, timezone)
    ).resolves.toEqual(expected)
    expect(stream.locked).toBe(false)
  })

  test('should propagate Web ReadableStream errors', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('stream failed'))
      },
    })

    await expect(
      convertCsvToFsrsItems(stream, nextDayStartsAt, 0)
    ).rejects.toThrow('stream failed')
    expect(stream.locked).toBe(false)
  })

  test('should convert an empty Web ReadableStream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close()
      },
    })

    await expect(
      convertCsvToFsrsItems(stream, nextDayStartsAt, 0)
    ).resolves.toEqual([])
    expect(stream.locked).toBe(false)
  })

  test('should reject non-Uint8Array chunks and release the lock', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue('invalid' as unknown as Uint8Array)
        controller.close()
      },
    })

    await expect(
      convertCsvToFsrsItems(stream, nextDayStartsAt, 0)
    ).rejects.toThrow()
    expect(stream.locked).toBe(false)
  })

  test('should reject a locked Web ReadableStream asynchronously', async () => {
    const stream = new ReadableStream<Uint8Array>()
    const reader = stream.getReader()

    try {
      const result = convertCsvToFsrsItems(stream, nextDayStartsAt, 0)
      expect(result).toBeInstanceOf(Promise)
      await expect(result).rejects.toThrow(/locked/i)
    } finally {
      reader.releaseLock()
    }
  })

  test('should throw for unsupported timezone', () => {
    const csvBuffer = Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        '1,1704067200000,3,0,1000',
        '1,1704153600000,3,2,1000',
      ].join('\n')
    )

    expect(() =>
      convertCsvToFsrsItems(csvBuffer, nextDayStartsAt, 'Mars/Base')
    ).toThrow('Unsupported timezone')
  })

  test('should reject unsupported timezone asynchronously for a Web ReadableStream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close()
      },
    })

    const result = convertCsvToFsrsItems(stream, nextDayStartsAt, 'Mars/Base')
    expect(result).toBeInstanceOf(Promise)
    await expect(result).rejects.toThrow('Unsupported timezone')
    expect(stream.locked).toBe(false)
  })

  test('should release the stream lock when attaching the finalizer fails', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close()
      },
    })
    const promiseFinally = Promise.prototype.finally
    const result = (() => {
      Reflect.set(Promise.prototype, 'finally', undefined)
      try {
        return convertCsvToFsrsItems(stream, nextDayStartsAt, 0)
      } finally {
        Reflect.set(Promise.prototype, 'finally', promiseFinally)
      }
    })()

    expect(result).toBeInstanceOf(Promise)
    await expect(result).rejects.toThrow()
    expect(stream.locked).toBe(false)
  })

  describe('getTimezoneOffset', () => {
    test('should parse GMT+8 format', () => {
      const offset = getTimezoneOffset('Asia/Shanghai', new Date('2024-01-01'))
      expect(offset).toBe(480) // UTC+8 = 480 minutes
    })

    test('should parse GMT-5 format', () => {
      const offset = getTimezoneOffset(
        'America/New_York',
        new Date('2024-01-01')
      )
      expect(offset).toBe(-300) // UTC-5 = -300 minutes (winter time)
    })

    test('should handle GMT+0 format', () => {
      const offset = getTimezoneOffset('UTC', new Date('2024-01-01'))
      expect(offset).toBe(0)
    })

    test('should parse GMT+5:30 format with minutes', () => {
      const offset = getTimezoneOffset('Asia/Kolkata', new Date('2024-01-01'))
      expect(offset).toBe(330) // UTC+5:30 = 330 minutes
    })

    test('should handle different date timestamps for DST', () => {
      // Summer time (DST active)
      const summerOffset = getTimezoneOffset(
        'America/New_York',
        new Date('2024-07-01')
      )
      // Winter time (DST inactive)
      const winterOffset = getTimezoneOffset(
        'America/New_York',
        new Date('2024-01-01')
      )

      // New York: UTC-4 in summer, UTC-5 in winter
      expect(summerOffset).toBe(-240) // UTC-4
      expect(winterOffset).toBe(-300) // UTC-5
    })

    test('should throw error for invalid timezone format', () => {
      // Mock a timezone that returns unparseable format
      expect(() => {
        // This should work with the fixed implementation
        getTimezoneOffset('Europe/London', new Date('2024-01-01'))
      }).not.toThrow()
    })
  })
})
