import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import { FSRSMemoryStateSchema } from '@/kit/index.js'
import type { FSRSState } from '@/kit/types.js'
import { FSRS3Algorithm } from './algorithm.js'
import { FSRS3_MODEL_BOUNDS } from './constants.js'
import {
  checkFSRS3Parameters,
  type FSRS3Config,
  fsrs3ConfigSchema,
  migrateFSRS3Parameters,
} from './parameters.js'

export type FSRS3ModelCore = ModelCore<{
  readonly config: FSRS3Config
  readonly memoryState: FSRSState
  readonly algorithm: FSRS3Algorithm
}>

const createFSRS3Model = (config: FSRS3Config): FSRS3ModelCore => {
  const bounds = FSRS3_MODEL_BOUNDS
  const algo = new FSRS3Algorithm(config.weights, bounds)

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

export const FSRS3Model = defineModel({
  name: 'fsrs-3',
  schema: {
    config: fsrs3ConfigSchema,
    memoryState: FSRSMemoryStateSchema,
  },
  defaultValue: {
    memoryState() {
      return { stability: 0, difficulty: 0 }
    },
  },
  create({ config, migrate = true, check = true, bypass = false }) {
    if (bypass) {
      return createFSRS3Model(config)
    }

    const weights = migrate
      ? migrateFSRS3Parameters(config.weights)
      : config.weights
    if (check) {
      checkFSRS3Parameters(weights)
    }

    const $config = fsrs3ConfigSchema.parse({ weights })

    return createFSRS3Model(Object.freeze($config))
  },
})
