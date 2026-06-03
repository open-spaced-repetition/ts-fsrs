import type {
  FSRSForwardInput,
  FSRSModelConfig,
  FSRSStepInput,
  IFSRSModel,
} from '../../kit'
import type { FSRSState } from '../../models.js'
import { FSRS3Algorithm } from './algorithm.js'
import { FSRS3_MODEL_BOUNDS } from './constants.js'

export type FSRS3Config = FSRSModelConfig

export const FSRS3Model = (config: FSRS3Config): IFSRSModel<FSRS3Config> => {
  const bounds = FSRS3_MODEL_BOUNDS

  const modelConfig: FSRS3Config = Object.freeze(config)

  const algo = new FSRS3Algorithm(modelConfig.weights, FSRS3_MODEL_BOUNDS)

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
