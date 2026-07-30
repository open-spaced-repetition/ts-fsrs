import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding-wasm32-wasip1'
import { expose } from 'comlink'

import { getSupportedTimezones } from '@/utils/timezone'

export interface ClientOptimizationResult {
  enableShortTerm: boolean
  parameters: number[]
  completed: boolean
}

export interface WorkerTrainingResult {
  results: ClientOptimizationResult[]
  stats: {
    parseTime: string
    trainingTime: string
    fsrsItemsCount: number
  }
}

const optimizer = {
  async train(
    csv: ArrayBuffer,
    nextDayStartsAt: number,
    timezone: string,
    numRelearningSteps: number
  ): Promise<WorkerTrainingResult> {
    if (!getSupportedTimezones.includes(timezone)) {
      throw new Error(`Unsupported timezone: ${timezone}`)
    }

    const parseStartTime = performance.now()
    const fsrsItems = convertCsvToFsrsItems(
      new Uint8Array(csv),
      nextDayStartsAt,
      timezone
    )
    const parseTime = `${(performance.now() - parseStartTime).toFixed(2)}ms`

    const trainingStartTime = performance.now()
    const results: ClientOptimizationResult[] = []
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
