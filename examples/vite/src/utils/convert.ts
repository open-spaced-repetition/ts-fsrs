import type { FSRSBindingItem } from '@open-spaced-repetition/binding'
import { getOptimizer } from '../binding'

/**
 * Read a CSV file and convert it to FSRS binding items using the user's local timezone.
 */
export async function convertFSRSItemsByFile(
  file: File,
  nextDayStartsAt: number
): Promise<FSRSBindingItem[]> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { convertCsvToFsrsItems } = await getOptimizer()

  return convertCsvToFsrsItems(buffer, nextDayStartsAt, timezone)
}
