import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  IModel,
  ModelDefinition,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import * as z from 'zod/mini'
import type { FSRSState } from '../../models.js'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_MODEL_BOUNDS } from './constants.js'

const fsrs6ConfigSchema = z.object({
  weights: z.array(z.number()),
  enableShortTerm: z.boolean(),
  numRelearningSteps: z.number(),
})

const fsrs6MemoryStateSchema = z.object({
  stability: z.number(),
  difficulty: z.number(),
})

export type FSRS6Config = z.output<typeof fsrs6ConfigSchema>

type FSRS6ModelCreate = (context: {
  readonly config: FSRS6Config
}) => IModel<FSRSState>

const createFSRS6Model = (config: FSRS6Config): IModel<FSRSState> => {
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
    bounds,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}

export const FSRS6Model: ModelDefinition<
  typeof fsrs6ConfigSchema,
  typeof fsrs6MemoryStateSchema,
  FSRS6ModelCreate
> = defineModel({
  name: 'fsrs-6',
  schema: {
    config: fsrs6ConfigSchema,
    memoryState: {
      schema: fsrs6MemoryStateSchema,
      default() {
        return { stability: 0, difficulty: 0 }
      },
    },
  },
  create({ config }) {
    const result = fsrs6ConfigSchema.safeParse(config)
    if (!result.success) {
      throw result.error
    }

    return createFSRS6Model(config)
  },
})
