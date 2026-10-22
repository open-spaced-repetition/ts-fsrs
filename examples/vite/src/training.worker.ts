import type { ComputeParametersOptions } from '@open-spaced-repetition/binding'

export interface TrainingRequest
  extends Required<
    Pick<
      ComputeParametersOptions,
      | 'modelVersion'
      | 'enableShortTerm'
      | 'enableSchedPenalties'
      | 'numRelearningSteps'
    >
  > {
  file: File
  nextDayStartsAt: number
}

export type TrainingMessage =
  | { type: 'parsed'; parseTime: string; fsrsItemsCount: number }
  | { type: 'progress'; progress: string }
  | { type: 'result'; parameters: number[] }
  | { type: 'done'; trainingTime: string }
  | { type: 'error'; message: string }

const send = (message: TrainingMessage) => self.postMessage(message)

self.onmessage = async ({ data }: MessageEvent<TrainingRequest>) => {
  try {
    // Register the listener before the WASM module's asynchronous initialization.
    const [{ computeParameters }, { convertFSRSItemsByFile }] =
      await Promise.all([
        import('@open-spaced-repetition/binding-wasm32-wasip1'),
        import('./utils/convert'),
      ])
    const parseStart = performance.now()
    const { items, cardIds } = await convertFSRSItemsByFile(
      data.file,
      data.nextDayStartsAt,
      data.modelVersion
    )
    if (items.length === 0) {
      throw new Error(
        data.modelVersion === 'FSRS-6'
          ? 'No valid review was found. Each card needs an initial New/Learning review and a later review on another day.'
          : 'No valid review was found. Each card needs an initial New/Learning review and a later review at a different timestamp.'
      )
    }
    send({
      type: 'parsed',
      parseTime: `${(performance.now() - parseStart).toFixed(2)}ms`,
      fsrsItemsCount: items.length,
    })
    const trainingStart = performance.now()
    let lastUpdate = 0
    const parameters = await computeParameters(items, {
      modelVersion: data.modelVersion,
      cardIds,
      enableShortTerm: data.modelVersion === 'FSRS-7' || data.enableShortTerm,
      enableSchedPenalties:
        data.modelVersion === 'FSRS-7' && data.enableSchedPenalties,
      numRelearningSteps:
        data.modelVersion === 'FSRS-6' ? data.numRelearningSteps : undefined,
      progress: (cur, total) => {
        const now = Date.now()
        if (cur === 0 || cur === total || now - lastUpdate >= 500) {
          lastUpdate = now
          send({
            type: 'progress',
            progress: `${cur}/${total}`,
          })
        }
      },
    })
    send({ type: 'result', parameters })
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
