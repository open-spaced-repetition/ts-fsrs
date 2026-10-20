import { convertCsvToFsrsItemsWithCardIds } from '@open-spaced-repetition/binding'
import type { ModelVersion } from '@/types/training'

export async function convertFSRSItemByFile(
  file: File,
  nextDayStartsAt: number,
  timezone: string,
  modelVersion: ModelVersion
) {
  const arrayBuffer: ArrayBuffer | null = await file.arrayBuffer()
  const buffer: Uint8Array | null = new Uint8Array(arrayBuffer)

  // Convert CSV to FSRS items
  const fsrsItems = convertCsvToFsrsItemsWithCardIds(
    buffer,
    nextDayStartsAt,
    timezone,
    modelVersion
  )

  return fsrsItems
}
