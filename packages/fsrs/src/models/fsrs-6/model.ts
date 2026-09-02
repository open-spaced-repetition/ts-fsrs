import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import { FSRSMemoryStateSchema } from '@/kit/index.js'
import type { FSRSState } from '@/kit/types.js'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_MODEL_BOUNDS } from './constants.js'
import {
  checkFSRS6Parameters,
  clipFSRS6Parameters,
  type FSRS6Config,
  fsrs6ConfigSchema,
  migrateFSRS6Parameters,
} from './parameters.js'

export type FSRS6ModelCore = ModelCore<{
  readonly config: FSRS6Config
  readonly memoryState: FSRSState
  readonly algorithm: FSRS6Algorithm
}>

const createFSRS6Model = (config: FSRS6Config): FSRS6ModelCore => {
  const bounds = FSRS6_MODEL_BOUNDS

  const algo = new FSRS6Algorithm(
    config.weights,
    config.enableShortTerm,
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
    config,
    bounds,
    algorithm: algo,
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
  create({
    config,
    migrate = true,
    clip = true,
    check = true,
    bypass = false,
  }) {
    if (bypass) {
      return createFSRS6Model(config)
    }

    let weights = migrate
      ? migrateFSRS6Parameters(config.weights)
      : config.weights
    if (clip && Array.isArray(weights)) {
      weights = clipFSRS6Parameters(
        weights,
        config.numRelearningSteps,
        config.enableShortTerm
      )
    }
    if (check) {
      checkFSRS6Parameters(
        weights,
        config.numRelearningSteps,
        config.enableShortTerm
      )
    }

    const $config = fsrs6ConfigSchema.parse({
      weights,
      enableShortTerm: config.enableShortTerm,
      numRelearningSteps: config.numRelearningSteps,
    })

    return createFSRS6Model(Object.freeze($config))
  },
})
