import type { StandardSchemaV1 } from '@standard-schema/spec'
import * as z from 'zod/mini'
import type { FSRSForwardInput, FSRSStepInput, IFSRSModel } from '../../kit'
import type { FSRSState } from '../../models.js'
import { FSRS5Algorithm } from './algorithm.js'
import {
  type FSRS5Config,
  type FSRS5ConfigInput,
  FSRS5ConfigSchema,
} from './config.js'
import { FSRS5_MODEL_BOUNDS } from './constants.js'

export const FSRS5Model = (
  config: FSRS5ConfigInput
): IFSRSModel<StandardSchemaV1<FSRS5ConfigInput, FSRS5Config>> => {
  const bounds = FSRS5_MODEL_BOUNDS

  const modelConfig = Object.freeze(z.parse(FSRS5ConfigSchema, config))

  const algo = new FSRS5Algorithm(
    modelConfig.weights,
    modelConfig.enableShortTerm,
    FSRS5_MODEL_BOUNDS
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
    '~configSchema': FSRS5ConfigSchema,
    bounds,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}
