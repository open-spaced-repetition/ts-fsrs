import * as fs from 'node:fs'
import {
  evaluateParameters,
  convertCsvToFsrsItems,
  FSRSBindingItem,
} from '@open-spaced-repetition/binding/index.js'
import { getTimezoneOffset } from './helpers/csv-parser.js'

describe('FSRS evaluate_parameters', () => {

  let allItems: FSRSBindingItem[] = []

  beforeAll(() => {
    const csvBuffer = fs.readFileSync(new URL('./revlog.csv', import.meta.url))
    allItems = convertCsvToFsrsItems(csvBuffer, 4, 'Asia/Shanghai', (ms, tz) =>
      getTimezoneOffset(tz, ms)
    )
  })

  test('basic evaluation with default options', async () => {
    if (allItems.length === 0) {
      throw new Error('No valid items parsed from CSV')
    }

    const result = await evaluateParameters(allItems)

    expect(result).toBeDefined()
    expect(typeof result.logLoss).toBe('number')
    expect(typeof result.rmseBins).toBe('number')
    expect(result.logLoss).toBeCloseTo(0.32696652,4)
    expect(result.rmseBins).toBeCloseTo(0.02679012,4)
    console.log('Evaluation result (default):', result)
  }, 180_000)
})
