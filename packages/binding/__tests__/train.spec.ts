import * as fs from 'node:fs'
import {
  computeParameters,
  convertCsvToFsrsItems,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding/index.js'
import { getTimezoneOffset } from './helpers/csv-parser.js'

describe('FSRS compute_parameters', () => {
  function createMinimalTestItem(): FSRSBindingItem {
    return new FSRSBindingItem([
      new FSRSBindingReview(3, 0),
      new FSRSBindingReview(4, 1),
    ])
  }

  let allItems: FSRSBindingItem[] = []
  beforeAll(() => {
    const csvBuffer = fs.readFileSync(new URL('./revlog.csv', import.meta.url))
    allItems = convertCsvToFsrsItems(csvBuffer, 4, 'Asia/Shanghai', (ms, tz) =>
      getTimezoneOffset(tz, ms)
    )
  })
  for (const shortTerm of [true, false]) {
    test(`compute_parameters with test data ${shortTerm ? 'enabled' : 'disabled'}`, async () => {
      if (allItems.length === 0) {
        throw new Error('No valid items parsed from CSV, skipping test')
      }

      try {
        const parameters = await computeParameters(allItems, {
          enableShortTerm: shortTerm,
          progress: (current: number, total: number) => {
            console.debug(
              `[shortTerm: ${shortTerm}] Progress: ${current}/${total}`
            )
          },
          timeout: 500,
        })

        expect(parameters).toBeDefined()
        expect(Array.isArray(parameters)).toBe(true)
        expect(parameters.length).toBeGreaterThan(0)
        console.log(
          `Computed parameters[${shortTerm ? 'shortTerm' : 'longTerm'}]:`,
          parameters
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log('Error caught:', errorMsg)
        throw error
      }
    }, 180_000)
  }

  test('compute_parameters with minimal data', async () => {
    const item = createMinimalTestItem()
    const parameters = await computeParameters([item], {
      enableShortTerm: true,
    })

    expect(parameters).toBeDefined()
    expect(Array.isArray(parameters)).toBe(true)
    console.log('Minimal data parameters:', parameters)
  })
})
