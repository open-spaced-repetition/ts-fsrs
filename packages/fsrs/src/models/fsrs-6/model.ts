import type {
  FSRSForwardInput,
  FSRSModelConfig,
  FSRSStepInput,
  IFSRSModel,
} from '../../kit'
import type { FSRSState } from '../../models.js'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_MODEL_BOUNDS } from './constants.js'

export type FSRS6Config = FSRSModelConfig & {
  numRelearningSteps: number
}

export const FSRS6Model = (config: FSRS6Config): IFSRSModel<FSRS6Config> => {
  const bounds = FSRS6_MODEL_BOUNDS

  const modelConfig: FSRS6Config = Object.freeze(config)

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
