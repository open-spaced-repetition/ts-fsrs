import {
  computeParameters,
  convertCsvToFsrsItemsWithCardIds,
} from '@open-spaced-repetition/binding-wasm32-wasip1'

export type RevlogTrainingOptions = {
  readonly enableShortTerm: boolean
  readonly modelVersion?: 'FSRS-6' | 'FSRS-7'
  readonly nextDayStartsAt: number
  readonly timezone: string
  readonly onProgress?: (current: number, total: number) => void
}

export type RevlogTrainingResult = {
  readonly itemCount: number
  readonly weights: readonly number[]
}

export async function trainRevlogCsv(
  csvText: string,
  options: RevlogTrainingOptions
): Promise<RevlogTrainingResult> {
  const { items, cardIds } = convertCsvToFsrsItemsWithCardIds(
    new TextEncoder().encode(csvText),
    options.nextDayStartsAt,
    options.timezone,
    options.modelVersion
  )
  if (items.length === 0) {
    throw new Error(
      options.modelVersion !== 'FSRS-6'
        ? 'No valid review was found. Each card needs an initial New/Learning review and a later review at a different timestamp.'
        : 'No valid review was found. Each card needs an initial New/Learning review and a later review on another day.'
    )
  }

  let reportedPercent = -1
  const weights = await computeParameters(items, {
    cardIds,
    enableShortTerm: options.enableShortTerm,
    modelVersion: options.modelVersion,
    progress(current, total) {
      const percent = Math.floor((current / total) * 100)
      if (percent === reportedPercent && current !== total) return
      reportedPercent = percent
      options.onProgress?.(current, total)
    },
  })
  return { itemCount: items.length, weights }
}
