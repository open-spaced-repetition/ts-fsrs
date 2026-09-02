import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import { FSRSMemoryStateSchema } from '@/kit/index.js'
import type { FSRSState } from '@/kit/types.js'
import { FSRS4Dot5Algorithm } from './algorithm.js'
import { FSRS4Dot5_MODEL_BOUNDS } from './constants.js'
import type { FSRS4Dot5Config } from './parameters.js'
import {
  checkFSRS4Dot5Parameters,
  clipFSRS4Dot5Parameters,
  fsrs4Dot5ConfigSchema,
  migrateFSRS4Dot5Parameters,
} from './parameters.js'

export type FSRS4Dot5ModelCore = ModelCore<{
  readonly config: FSRS4Dot5Config
  readonly memoryState: FSRSState
  readonly algorithm: FSRS4Dot5Algorithm
}>

const createFSRS4Dot5Model = (config: FSRS4Dot5Config): FSRS4Dot5ModelCore => {
  const bounds = FSRS4Dot5_MODEL_BOUNDS

  const algo = new FSRS4Dot5Algorithm(config.weights, FSRS4Dot5_MODEL_BOUNDS)

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
    algorithm: algo,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}

export const FSRS4Dot5Model = defineModel({
  name: 'fsrs-4dot5',
  schema: {
    config: fsrs4Dot5ConfigSchema,
    memoryState: FSRSMemoryStateSchema,
  },
  defaultValue: {
    memoryState() {
      return { stability: 0, difficulty: 0 }
    },
  },
  create({
    config,
    migrate = true,
    clip = true,
    check = true,
    bypass = false,
  }) {
    if (bypass) {
      return createFSRS4Dot5Model(config)
    }

    let weights = migrate
      ? migrateFSRS4Dot5Parameters(config.weights)
      : config.weights
    if (clip && Array.isArray(weights)) {
      weights = clipFSRS4Dot5Parameters(weights)
    }
    if (check) {
      checkFSRS4Dot5Parameters(weights)
    }

    const $config = fsrs4Dot5ConfigSchema.parse({ weights })

    return createFSRS4Dot5Model(Object.freeze($config))
  },
})
