import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import { FSRSMemoryStateSchema } from '@/kit/index.js'
import type { FSRSState } from '@/kit/types.js'
import { FSRS4Algorithm } from './algorithm.js'
import { FSRS4_MODEL_BOUNDS } from './constants.js'
import {
  checkFSRS4Parameters,
  type FSRS4Config,
  fsrs4ConfigSchema,
  migrateFSRS4Parameters,
} from './parameters.js'

export type FSRS4ModelCore = ModelCore<{
  readonly config: FSRS4Config
  readonly memoryState: FSRSState
  readonly algorithm: FSRS4Algorithm
}>

const createFSRS4Model = (config: FSRS4Config): FSRS4ModelCore => {
  const bounds = FSRS4_MODEL_BOUNDS

  const algo = new FSRS4Algorithm(config.weights, FSRS4_MODEL_BOUNDS)

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

export const FSRS4Model = defineModel({
  name: 'fsrs-4',
  schema: {
    config: fsrs4ConfigSchema,
    memoryState: FSRSMemoryStateSchema,
  },
  defaultValue: {
    memoryState() {
      return { stability: 0, difficulty: 0 }
    },
  },
  create({ config, migrate = true, check = true, bypass = false }) {
    if (bypass) {
      return createFSRS4Model(config)
    }

    const weights = migrate
      ? migrateFSRS4Parameters(config.weights)
      : config.weights
    if (check) {
      checkFSRS4Parameters(weights)
    }

    const $config = fsrs4ConfigSchema.parse({ weights })

    return createFSRS4Model(Object.freeze($config))
  },
})
