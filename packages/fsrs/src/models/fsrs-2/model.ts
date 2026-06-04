import type {
  FSRSForwardInput,
  FSRSModelConfig,
  FSRSStepInput,
  IFSRSModel,
} from '../../kit'
import type { FSRSState } from '../../models.js'
import { FSRS2Algorithm } from './algorithm.js'
import { FSRS2_MODEL_BOUNDS } from './constants.js'

export type FSRS2Config = FSRSModelConfig

export const FSRS2Model = (config: FSRS2Config): IFSRSModel<FSRS2Config> => {
  const bounds = FSRS2_MODEL_BOUNDS

  const modelConfig: FSRS2Config = Object.freeze(config)

  const algo = new FSRS2Algorithm(modelConfig.weights, FSRS2_MODEL_BOUNDS)

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
