import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import { FSRSMemoryStateSchema } from '../../kit/index.js'
import type { FSRSState } from '../../models.js'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_MODEL_BOUNDS } from './constants.js'
import { type FSRS6Config, fsrs6ConfigSchema } from './parameters.js'

const createFSRS6Model = (
  config: FSRS6Config
): ModelCore<{
  readonly config: FSRS6Config
  readonly memoryState: FSRSState
}> => {
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

export const FSRS6Model = defineModel({
  name: 'fsrs-6',
  schema: {
    config: fsrs6ConfigSchema,
    memoryState: FSRSMemoryStateSchema,
  },
  defaultValue: {
    memoryState() {
      return { stability: 0, difficulty: 0 }
    },
  },
  create({ config }) {
    return createFSRS6Model(fsrs6ConfigSchema.parse(config))
  },
})
