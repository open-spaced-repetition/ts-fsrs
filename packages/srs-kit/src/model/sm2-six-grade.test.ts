import type {
  RatingScale,
  RatingScaleGradeOf,
} from '@/primitives/rating-scale.js'
import { defineSchema } from '@/schema/index.js'
import type {
  ModelBounds,
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from './model.js'
import { defineModel } from './model.js'

export const sm2SixGradeScale = Object.freeze({
  Manual: Object.freeze({ value: -1, manual: true }),
  Blackout: Object.freeze({ value: 0, lapse: true }),
  Wrong: Object.freeze({ value: 1, lapse: true }),
  HardFail: Object.freeze({ value: 2, lapse: true }),
  PassHard: Object.freeze({ value: 3 }),
  PassGood: Object.freeze({ value: 4 }),
  PassEasy: Object.freeze({ value: 5 }),
} as const) satisfies RatingScale

export type SM2SixGrade = RatingScaleGradeOf<typeof sm2SixGradeScale>

export interface SM2SixGradeState {
  readonly interval: number
  readonly easeFactor: number
  readonly reviewStep: number
}

export interface SM2SixGradeConfig {
  readonly weights: readonly number[]
}

export const SM2_SIX_GRADE_DEFAULT_WEIGHTS: readonly number[] = [
  1, 6, 2.5, 0.02, 5, 0.1,
]

const BOUNDS: ModelBounds<SM2SixGradeState> = Object.freeze({
  iMin: 0.01,
  iMax: 36500,
  eMin: 1.3,
  eMax: 10.0,
  rMin: 0,
  rMax: 36500,
})

const configSchema = defineSchema<SM2SixGradeConfig>((value) => {
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

const memoryStateSchema = defineSchema<SM2SixGradeState>((value) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'interval' in value &&
    'easeFactor' in value &&
    'reviewStep' in value &&
    typeof value.interval === 'number' &&
    typeof value.easeFactor === 'number' &&
    typeof value.reviewStep === 'number'
  ) {
    return {
      value: {
        interval: value.interval,
        easeFactor: value.easeFactor,
        reviewStep: value.reviewStep,
      },
    }
  }
  return { issues: [{ message: 'Expected SM2 memory state' }] }
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function createSM2SixGradeCore(config: SM2SixGradeConfig): ModelCore<{
  readonly config: SM2SixGradeConfig
  readonly memoryState: SM2SixGradeState
  readonly algorithm: null
  readonly grade: SM2SixGrade
}> {
  const w = config.weights

  const step = ({
    memoryState,
    rating,
  }: ModelStepInput<SM2SixGradeState, SM2SixGrade>): SM2SixGradeState => {
    const { interval, easeFactor, reviewStep } = memoryState ?? {
      interval: 0,
      easeFactor: w[2],
      reviewStep: 0,
    }

    const success = rating >= 3
    const newReviewStep = success ? reviewStep + 1 : 1

    let newInterval: number
    if (newReviewStep === 1) {
      newInterval = w[0]
    } else if (newReviewStep === 2) {
      newInterval = w[1]
    } else {
      newInterval = interval * easeFactor
    }

    const diff = 5 - rating
    const newEf = easeFactor + (w[5] - diff * (0.08 + diff * w[3]))

    return {
      interval: clamp(newInterval, BOUNDS.iMin, BOUNDS.iMax),
      easeFactor: clamp(newEf, BOUNDS.eMin, BOUNDS.eMax),
      reviewStep: newReviewStep,
    }
  }

  const forgettingCurve = (
    memoryState: Readonly<SM2SixGradeState>,
    elapsedDays: number
  ): number => Math.pow(0.9, elapsedDays / memoryState.interval)

  const nextInterval = (
    memoryState: Readonly<SM2SixGradeState>,
    desiredRetention: number
  ): number =>
    Math.max(
      Math.round(
        (memoryState.interval * Math.log(desiredRetention)) / Math.log(0.9)
      ),
      1
    )

  const forward = ({
    history,
    initialState,
  }: ModelForwardInput<SM2SixGradeState, SM2SixGrade>): SM2SixGradeState[] => {
    const states: SM2SixGradeState[] = []
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
    bounds: BOUNDS,
    algorithm: null,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}

export const SM2SixGradeModel = defineModel({
  name: 'sm2-six-grade',
  ratings: sm2SixGradeScale,
  schema: {
    config: configSchema,
    memoryState: memoryStateSchema,
  },
  defaultValue: {
    memoryState({ config }) {
      return { interval: 0, easeFactor: config.weights[2], reviewStep: 0 }
    },
  },
  create({ config, bypass }) {
    return createSM2SixGradeCore(bypass ? config : configSchema.parse(config))
  },
})
