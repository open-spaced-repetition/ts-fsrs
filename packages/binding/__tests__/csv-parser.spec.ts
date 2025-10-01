import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCSVToFSRSItems } from './helpers/csv-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('CSV Parser', () => {
  const testDataPath = path.join(__dirname, 'revlog.csv')

  test('should parse CSV file correctly', () => {
    if (!fs.existsSync(testDataPath)) {
      throw new Error('revlog.csv not found')
    }

    const items = parseCSVToFSRSItems(testDataPath)

    expect(items).toBeDefined()
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)

    console.log(`Parsed ${items.length} items from CSV`)
  })

  test('should filter items correctly', () => {
    if (!fs.existsSync(testDataPath)) {
      throw new Error('revlog.csv not found')
    }

    const items = parseCSVToFSRSItems(testDataPath)

    // All items should have at least one review with deltaT > 0
    for (const item of items) {
      const hasPositiveDelta = item.reviews.some((r) => r.deltaT > 0)
      expect(hasPositiveDelta).toBe(true)
    }

    console.log(`All ${items.length} items have valid deltaT values`)
  })

  test('should handle reviews with proper time intervals', () => {
    if (!fs.existsSync(testDataPath)) {
      throw new Error('revlog.csv not found')
    }

    const items = parseCSVToFSRSItems(testDataPath)

    // Sample check: first few items should have reasonable structure
    const sampleSize = Math.min(10, items.length)
    for (let i = 0; i < sampleSize; i++) {
      const item = items[i]
      expect(item.reviews.length).toBeGreaterThan(0)

      // First review should have deltaT === 0
      expect(item.reviews[0].deltaT).toBe(0)

      // Verify ratings are in valid range (1-4)
      for (const review of item.reviews) {
        expect(review.rating).toBeGreaterThanOrEqual(1)
        expect(review.rating).toBeLessThanOrEqual(4)
      }
    }

    console.log(`Verified structure of ${sampleSize} sample items`)
  })
})
