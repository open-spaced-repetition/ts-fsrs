import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding/index.js'
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
})
