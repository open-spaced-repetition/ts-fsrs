/// <reference path="../index.d.ts" />
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  computeParameters,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding/index.js'
import { parseCSVToFSRSItems } from './helpers/csv-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('FSRS compute_parameters', () => {
  const testDataPath = path.join(__dirname, 'revlog.csv')

  function createMinimalTestItem(): FSRSBindingItem {
    return new FSRSBindingItem([
      new FSRSBindingReview(3, 0),
      new FSRSBindingReview(4, 1),
    ])
  }

  for (const shortTerm of [true, false]) {
    test(`compute_parameters with test data ${shortTerm ? 'enabled' : 'disabled'}`, async () => {
      if (!fs.existsSync(testDataPath)) {
        throw new Error('revlog.csv not found, skipping test')
      }

      const allItems = parseCSVToFSRSItems(testDataPath)

      if (allItems.length === 0) {
        throw new Error('No valid items parsed from CSV, skipping test')
      }

      try {
        const parameters = await computeParameters(allItems, {
          enableShortTerm: shortTerm,
          progress: (current: number, total: number) => {
            console.log(
              `[shortTerm: ${shortTerm}] Progress: ${current}/${total}`
            )
          },
          timeout: 500,
        })

        expect(parameters).toBeDefined()
        expect(Array.isArray(parameters)).toBe(true)
        expect(parameters.length).toBeGreaterThan(0)
        console.log('Computed parameters:', parameters)
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
  }, 180_000)
})
