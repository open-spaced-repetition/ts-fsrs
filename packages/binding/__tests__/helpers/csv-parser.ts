import * as fs from 'node:fs'
import {
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding/index.js'
import Papa from 'papaparse'

export interface CSVRecord {
  review_time: string
  card_id: string
  review_rating: string
  review_state: string
}

type ReviewEntry = [Date, number, number]

/**
 * Calculate difference in days between two dates using UTC
 */
function dateDiffInDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const utc2 = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.floor((utc2 - utc1) / MS_PER_DAY)
}

/**
 * Group reviews by card ID and sort by timestamp
 */
function groupReviewsByCard(
  records: CSVRecord[]
): Record<string, ReviewEntry[]> {
  const reviewsByCard: Record<string, ReviewEntry[]> = {}

  for (const record of records) {
    const cardId = record.card_id
    if (!reviewsByCard[cardId]) {
      reviewsByCard[cardId] = []
    }

    const timestamp = Number.parseInt(record.review_time, 10)
    const date = new Date(timestamp)
    const rating = Number.parseInt(record.review_rating, 10)
    const state = Number.parseInt(record.review_state, 10)

    reviewsByCard[cardId].push([date, rating, state])
  }

  // Sort reviews by date for each card
  for (const reviews of Object.values(reviewsByCard)) {
    reviews.sort((a, b) => a[0].getTime() - b[0].getTime())
  }

  return reviewsByCard
}

/**
 * Remove review history before the last learning block
 * This ensures we only keep the most recent learning session
 */
function removeRevlogBeforeLastLearning(entries: ReviewEntry[]): ReviewEntry[] {
  const isLearningState = (entry: ReviewEntry): boolean =>
    [0, 1].includes(entry[2])

  let lastLearningBlockStart = -1
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isLearningState(entries[i])) {
      lastLearningBlockStart = i
    } else if (lastLearningBlockStart !== -1) {
      break
    }
  }

  return lastLearningBlockStart !== -1
    ? entries.slice(lastLearningBlockStart)
    : []
}

/**
 * Convert review history to FSRSBindingItem
 * Only returns items that have at least one review with deltaT > 0
 */
function convertToFSRSItem(history: ReviewEntry[]): FSRSBindingItem | null {
  if (history.length === 0) return null

  const reviews: FSRSBindingReview[] = []
  let lastDate = history[0][0]

  for (const [date, rating] of history) {
    const deltaT = dateDiffInDays(lastDate, date)
    reviews.push(new FSRSBindingReview(rating, deltaT))
    lastDate = date
  }

  const item = new FSRSBindingItem(reviews)
  return item.reviews.some((r) => r.deltaT > 0) ? item : null
}

/**
 * Parse CSV file and convert to FSRSBindingItem array
 * Applies proper filtering and preprocessing logic
 */
export function parseCSVToFSRSItems(csvPath: string): FSRSBindingItem[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const parsed = Papa.parse<CSVRecord>(csvContent, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${parsed.errors.join(', ')}`)
  }
  console.log(`Parsed ${parsed.data.length} records from CSV`)

  const reviewsByCard = groupReviewsByCard(parsed.data)

  return Object.values(reviewsByCard)
    .map(removeRevlogBeforeLastLearning)
    .filter((history) => history.length > 0)
    .map(convertToFSRSItem)
    .filter((item): item is FSRSBindingItem => item !== null)
}
