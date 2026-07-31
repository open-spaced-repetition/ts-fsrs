import { expose } from 'comlink'

import type { OptimizationResult, TrainingStats } from './types/training'

export interface WorkerTrainingResult {
  results: OptimizationResult[]
  stats: TrainingStats
}

export interface WorkerTrainingRequest {
  csv: ArrayBuffer
  nextDayStartsAt: number
  timezone: string
  numRelearningSteps: number
}

export type WorkerTrainingEvent =
  | {
      type: 'progress'
      enableShortTerm: boolean
      current: number
      total: number
    }
  | { type: 'completed'; result: OptimizationResult }

async function train(
  data: WorkerTrainingRequest
): Promise<WorkerTrainingResult> {
  const { computeParameters, convertCsvToFsrsItems } = await import(
    '@open-spaced-repetition/binding-wasm32-wasip1'
  )
  const parseStartTime = performance.now()
  const fsrsItems = convertCsvToFsrsItems(
    new Uint8Array(data.csv),
    data.nextDayStartsAt,
    data.timezone
  )
  const parseTime = `${(performance.now() - parseStartTime).toFixed(2)}ms`

  const trainingStartTime = performance.now()
  const results: OptimizationResult[] = []
  for (const enableShortTerm of [true, false]) {
    let progress = '0/0'
    const parameters = computeParameters(fsrsItems, {
      enableShortTerm,
      numRelearningSteps: data.numRelearningSteps,
      progress: (current, total) => {
        progress = `${current}/${total}`
        self.postMessage({
          type: 'progress',
          enableShortTerm,
          current,
          total,
        } satisfies WorkerTrainingEvent)
      },
    })
    const result = {
      enableShortTerm,
      parameters,
      progress,
      completed: true,
    }
    results.push(result)
    self.postMessage({
      type: 'completed',
      result,
    } satisfies WorkerTrainingEvent)
  }

  return {
    results,
    stats: {
      parseTime,
      trainingTime: `${(performance.now() - trainingStartTime).toFixed(2)}ms`,
      fsrsItemsCount: fsrsItems.length,
    },
  }
}

const optimizerWorker = { train }

export type OptimizerWorker = typeof optimizerWorker

expose(optimizerWorker)
