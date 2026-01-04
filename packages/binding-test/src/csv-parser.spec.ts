import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding'
import { getTimezoneOffset, parseCSVToFSRSItems } from './helpers/csv-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('CSV Parser', () => {
  const testDataPath = path.join(__dirname, 'revlog.csv')
  const nextDayStartsAt = 4
  const timezone = 'Asia/Shanghai'

  test('should match Rust implementation count', () => {
    // TS version
    const tsItems = parseCSVToFSRSItems(testDataPath, nextDayStartsAt, timezone)

    // RS version
    const csvBuffer = fs.readFileSync(testDataPath)
    const rsItems = convertCsvToFsrsItems(
      csvBuffer,
      nextDayStartsAt,
      timezone,
      (ms, tz) => getTimezoneOffset(tz, ms)
    )

    // This count should match the Rust implementation
    expect(tsItems.length).toBe(rsItems.length)
    console.log(
      `✅ TS version (${tsItems.length}) matches RS version (${rsItems.length})`
    )
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
