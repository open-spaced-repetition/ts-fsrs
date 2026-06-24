import { defineSchema } from '@/schema/index.js'
import type {
  ModelBounds,
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from './model.js'
import { defineModel } from './model.js'

// ==========
// SM2 Types
// ==========

export interface SM2State {
  readonly interval: number
  readonly easeFactor: number
  readonly reps: number
}

export interface SM2Config {
  readonly weights: readonly number[]
}

// ==========
// SM2 Constants
// ==========

export const SM2_DEFAULT_WEIGHTS: readonly number[] = [1, 6, 2.5, 0.02, 7, 0.18]

export const SM2_MODEL_BOUNDS: ModelBounds<SM2State> = Object.freeze({
  iMin: 0.01,
  iMax: 36500,
  eMin: 1.3,
  eMax: 10.0,
  rMin: 0,
  rMax: 36500,
})

// ==========
// SM2 Schemas
// ==========

const sm2ConfigSchema = defineSchema<SM2Config>((value) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'weights' in value &&
    Array.isArray(value.weights) &&
    value.weights.length === 6 &&
    value.weights.every(
      (w: unknown) => typeof w === 'number' && Number.isFinite(w)
    )
  ) {
    return { value: { weights: value.weights } }
  }
  return {
    issues: [{ message: 'Expected SM2 config with 6 finite number weights' }],
  }
})

const sm2MemoryStateSchema = defineSchema<SM2State>((value) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'interval' in value &&
    'easeFactor' in value &&
    'reps' in value &&
    typeof value.interval === 'number' &&
    typeof value.easeFactor === 'number' &&
    typeof value.reps === 'number'
  ) {
    return {
      value: {
        interval: value.interval,
        easeFactor: value.easeFactor,
        reps: value.reps,
      },
    }
  }
  return { issues: [{ message: 'Expected SM2 memory state' }] }
})

// ==========
// SM2 Algorithm
// ==========

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function createSM2Core(
  config: SM2Config
): ModelCore<{ readonly config: SM2Config; readonly memoryState: SM2State }> {
  const w = config.weights
  const bounds = SM2_MODEL_BOUNDS

  const step = ({
    memoryState,
    rating,
  }: ModelStepInput<SM2State>): SM2State => {
    const { interval, easeFactor, reps } = memoryState ?? {
      interval: 0,
      easeFactor: w[2],
      reps: 0,
    }

    const success = rating > 1
    const newReps = success ? reps + 1 : 1

    let newInterval: number
    if (newReps === 1) {
      newInterval = w[0]
    } else if (newReps === 2) {
      newInterval = w[1]
    } else {
      newInterval = interval * easeFactor
    }

    const q = rating + 1
    const newEf = easeFactor - w[3] * (q - w[4]) ** 2 + w[5]

    return {
      interval: clamp(newInterval, bounds.iMin, bounds.iMax),
      easeFactor: clamp(newEf, bounds.eMin, bounds.eMax),
      reps: newReps,
    }
  }

  const forgettingCurve = (
    memoryState: Readonly<SM2State>,
    elapsedDays: number
  ): number => {
    return Math.pow(0.9, elapsedDays / memoryState.interval)
  }

  const nextInterval = (
    memoryState: Readonly<SM2State>,
    desiredRetention: number
  ): number => {
    return Math.max(
      Math.round(
        (memoryState.interval * Math.log(desiredRetention)) / Math.log(0.9)
      ),
      1
    )
  }

  const forward = ({
    history,
    initialState,
  }: ModelForwardInput<SM2State>): SM2State[] => {
    const states: SM2State[] = []
    let state = initialState ?? null
    for (const review of history) {
      state = step({
        memoryState: state,
        rating: review.rating,
        elapsedDays: review.deltaT,
      })
      states.push(state)
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

// ==========
// SM2 Model
// ==========

export const SM2Model = defineModel({
  name: 'sm2',
  schema: {
    config: sm2ConfigSchema,
    memoryState: sm2MemoryStateSchema,
  },
  defaultValue: {
    memoryState({ config }) {
      return { interval: 0, easeFactor: config.weights[2], reps: 0 }
    },
  },
  create({ config }) {
    return createSM2Core(sm2ConfigSchema.parse(config))
  },
})
