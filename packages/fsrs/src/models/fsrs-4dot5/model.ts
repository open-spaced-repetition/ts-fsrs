import type {
  FSRSForwardInput,
  FSRSModelConfig,
  FSRSStepInput,
  IFSRSModel,
} from '../../kit'
import type { FSRSState } from '../../models.js'
import { FSRS4Dot5Algorithm } from './algorithm.js'
import { FSRS4Dot5_MODEL_BOUNDS } from './constants.js'

export type FSRS4Dot5Config = FSRSModelConfig

export const FSRS4Dot5Model = (
  config: FSRS4Dot5Config
): IFSRSModel<FSRS4Dot5Config> => {
  const bounds = FSRS4Dot5_MODEL_BOUNDS

  const modelConfig: FSRS4Dot5Config = Object.freeze(config)

  const algo = new FSRS4Dot5Algorithm(
    modelConfig.weights,
    FSRS4Dot5_MODEL_BOUNDS
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
