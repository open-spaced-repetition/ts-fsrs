import {
  type TrainingParameters,
  trainingSchema,
} from './types/training-schema'

export type TrainingRequest = TrainingParameters & { file: File }

export type TrainingMessage =
  | { type: 'parsed'; parseTime: string; fsrsItemsCount: number }
  | { type: 'progress'; enableShortTerm: boolean; progress: string }
  | { type: 'result'; enableShortTerm: boolean; parameters: number[] }
  | { type: 'done'; trainingTime: string }
  | { type: 'error'; message: string }

const send = (message: TrainingMessage) => self.postMessage(message)

self.onmessage = async ({ data }: MessageEvent<TrainingRequest>) => {
  try {
    const { nextDayStartsAt, timezone, ...config } = trainingSchema.parse(data)
    const { computeParameters, convertCsvToFsrsItemsWithCardIds } =
      await import('@open-spaced-repetition/binding-wasm32-wasip1')
    const parseStart = performance.now()
    const { items, cardIds } = convertCsvToFsrsItemsWithCardIds(
      new Uint8Array(await data.file.arrayBuffer()),
      nextDayStartsAt,
      timezone,
      config.modelVersion
    )
    if (items.length === 0) {
      throw new Error('No valid reviews were found for the selected model.')
    }
    send({
      type: 'parsed',
      parseTime: `${(performance.now() - parseStart).toFixed(2)}ms`,
      fsrsItemsCount: items.length,
    })
    const trainingStart = performance.now()
    const { enableShortTerm } = config
    let lastUpdate = 0
    const parameters = await computeParameters(items, {
      ...config,
      cardIds,
      progress: (cur, total) => {
        const now = Date.now()
        if (cur === 0 || cur === total || now - lastUpdate >= 500) {
          lastUpdate = now
          send({
            type: 'progress',
            enableShortTerm,
            progress: `${cur}/${total}`,
          })
        }
      },
    })
    send({ type: 'result', enableShortTerm, parameters })
    send({
      type: 'done',
      trainingTime: `${(performance.now() - trainingStart).toFixed(2)}ms`,
    })
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
