import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding-wasm32-wasip1'
import { expose } from 'comlink'

import type { OptimizationResult, TrainingStats } from './types/training'

export interface WorkerTrainingResult {
  results: OptimizationResult[]
  stats: TrainingStats
}

const optimizer = {
  async train(
    csv: ArrayBuffer,
    nextDayStartsAt: number,
    timezone: string,
    numRelearningSteps: number
  ): Promise<WorkerTrainingResult> {
    const parseStartTime = performance.now()
    const fsrsItems = convertCsvToFsrsItems(
      new Uint8Array(csv),
      nextDayStartsAt,
      timezone
    )
    const parseTime = `${(performance.now() - parseStartTime).toFixed(2)}ms`

    const trainingStartTime = performance.now()
    const results: OptimizationResult[] = []
    for (const enableShortTerm of [true, false]) {
      const parameters = await computeParameters(fsrsItems, {
        enableShortTerm,
        numRelearningSteps,
      })
      results.push({ enableShortTerm, parameters, completed: true })
    }

    return {
      results,
      stats: {
        parseTime,
        trainingTime: `${(performance.now() - trainingStartTime).toFixed(2)}ms`,
        fsrsItemsCount: fsrsItems.length,
      },
    }
  },
}

export type OptimizerWorker = typeof optimizer

expose(optimizer)
self.postMessage('ready')
