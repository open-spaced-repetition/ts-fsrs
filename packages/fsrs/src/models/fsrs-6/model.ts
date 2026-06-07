import * as z from 'zod/mini'
import type { FSRSForwardInput, FSRSStepInput, IFSRSModel } from '../../kit'
import type { FSRSState } from '../../models.js'
import {
  FSRSMemoryStateSchema,
  type SchedulerModelFactory,
} from '../../scheduler/model.js'
import { FSRS6Algorithm } from './algorithm.js'
import { type FSRS6Config, FSRS6ConfigSchema } from './config.js'
import { FSRS6_MODEL_BOUNDS } from './constants.js'

const createFSRS6Model = (
  config: z.input<typeof FSRS6ConfigSchema>
): IFSRSModel<FSRS6Config> => {
  const bounds = FSRS6_MODEL_BOUNDS

  const modelConfig = Object.freeze(z.parse(FSRS6ConfigSchema, config))

  const algo = new FSRS6Algorithm(
    modelConfig.weights,
    modelConfig.enableShortTerm,
    FSRS6_MODEL_BOUNDS
  )

  const step = ({
    memoryState,
    rating,
    elapsedDays,
    retrievability,
  }: FSRSStepInput): FSRSState => {
    return algo.next_state(memoryState, elapsedDays, rating, retrievability)
  }

  const nextInterval = (
    memoryState: FSRSState,
    desiredRetention: number
  ): number => {
    return algo.next_interval(memoryState.stability, desiredRetention)
  }

  const forgettingCurve = (
    memoryState: FSRSState,
    elapsedDays: number
  ): number => {
    return algo.forgetting_curve(elapsedDays, memoryState.stability)
  }

  const forward = ({
    history,
    initialState,
  }: FSRSForwardInput): FSRSState[] => {
    const states: FSRSState[] = []
    let memoryState = initialState || null
    for (const review of history) {
      memoryState = step({
        memoryState,
        rating: review.rating,
        elapsedDays: review.deltaT,
      })
      states.push(memoryState)
    }
    return states
  }

  return {
    config: modelConfig,
    bounds,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}

export const FSRS6Model: SchedulerModelFactory<
  typeof FSRS6ConfigSchema,
  typeof FSRSMemoryStateSchema
> = {
  configSchema: FSRS6ConfigSchema,
  memoryStateSchema: FSRSMemoryStateSchema,
  create: createFSRS6Model,
}
