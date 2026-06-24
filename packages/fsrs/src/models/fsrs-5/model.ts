import type {
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import { defineModel } from '@open-spaced-repetition/srs-kit/model'
import { FSRSMemoryStateSchema } from '../../kit/index.js'
import type { FSRSState } from '../../models.js'
import { FSRS5Algorithm } from './algorithm.js'
import { FSRS5_MODEL_BOUNDS } from './constants.js'
import { type FSRS5Config, fsrs5ConfigSchema } from './parameters.js'

const createFSRS5Model = (
  config: FSRS5Config
): ModelCore<{
  readonly config: FSRS5Config
  readonly memoryState: FSRSState
}> => {
  const bounds = FSRS5_MODEL_BOUNDS

  const modelConfig: FSRS5Config = Object.freeze(config)

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
  }: ModelStepInput<FSRSState>): FSRSState => {
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
  }: ModelForwardInput<FSRSState>): FSRSState[] => {
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

export const FSRS5Model = defineModel({
  name: 'fsrs-5',
  schema: {
    config: fsrs5ConfigSchema,
    memoryState: FSRSMemoryStateSchema,
  },
  defaultValue: {
    memoryState() {
      return { stability: 0, difficulty: 0 }
    },
  },
  create({ config }) {
    return createFSRS5Model(fsrs5ConfigSchema.parse(config))
  },
})
