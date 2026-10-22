import {
  convertCsvToFsrsItemsWithCardIds,
  type FSRSItemsWithCardIds,
} from '@open-spaced-repetition/binding-wasm32-wasip1'
import type { TrainingModel } from '../types/training'

/**
 * Read a CSV file and convert it to FSRS binding items using the user's local timezone.
 */
export async function convertFSRSItemsByFile(
  file: File,
  nextDayStartsAt: number,
  modelVersion: TrainingModel
): Promise<FSRSItemsWithCardIds> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return convertCsvToFsrsItemsWithCardIds(
    buffer,
    nextDayStartsAt,
    timezone,
    modelVersion
  )
}
