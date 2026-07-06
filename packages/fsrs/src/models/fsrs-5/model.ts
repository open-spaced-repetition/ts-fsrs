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
import {
  checkFSRS5Parameters,
  type FSRS5Config,
  fsrs5ConfigSchema,
  migrateFSRS5Parameters,
} from './parameters.js'

const createFSRS5Model = (
  config: FSRS5Config
): ModelCore<{
  readonly config: FSRS5Config
  readonly memoryState: FSRSState
}> => {
  const bounds = FSRS5_MODEL_BOUNDS

  const algo = new FSRS5Algorithm(
    config.weights,
    config.enableShortTerm,
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
    config,
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
  create({ config, migrate = true, check = true, bypass = false }) {
    if (bypass) {
      return createFSRS5Model(config)
    }

    const weights = migrate
      ? migrateFSRS5Parameters(config.weights)
      : config.weights
    if (check) {
      checkFSRS5Parameters(weights)
    }

    const $config = fsrs5ConfigSchema.parse({
      weights,
      enableShortTerm: config.enableShortTerm,
    })

    return createFSRS5Model(Object.freeze($config))
  },
})
