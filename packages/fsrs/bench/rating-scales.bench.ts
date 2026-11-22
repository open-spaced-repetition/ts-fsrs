import {
  defineModel,
  defineScheduler,
  defineSchema,
  type ModelForwardInput,
  type ModelStepInput,
  Rating,
  type RatingScale,
  type RatingScaleGradeOf,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { numericChrono } from '@open-spaced-repetition/srs-kit/chrono/numeric'
import {
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
} from 'ts-fsrs/middlewares/index.js'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6/constants.js'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6/model.js'
import { Reschedule } from 'ts-fsrs/reschedule/index.js'
import { describe, test } from 'vitest'

const sixGradeScale = Object.freeze({
  Manual: Object.freeze({ value: -1, manual: true }),
  Blackout: Object.freeze({ value: 0, lapse: true }),
  Wrong: Object.freeze({ value: 1, lapse: true }),
  HardFail: Object.freeze({ value: 2, lapse: true }),
  PassHard: Object.freeze({ value: 3 }),
  PassGood: Object.freeze({ value: 4 }),
  PassEasy: Object.freeze({ value: 5 }),
} as const) satisfies RatingScale

type SixGrade = RatingScaleGradeOf<typeof sixGradeScale>
type SixState = { readonly interval: number; readonly easeFactor: number }
type SixConfig = { readonly baseInterval: number }

const sixConfigSchema = defineSchema<SixConfig>((value) => ({
  value: (value as SixConfig) ?? { baseInterval: 1 },
}))
const sixStateSchema = defineSchema<SixState>((value) => ({
  value: (value as SixState) ?? { interval: 1, easeFactor: 2.5 },
}))

const SixGradeBenchModel = defineModel({
  name: 'sm2-six-grade-bench',
  ratings: sixGradeScale,
  schema: {
    config: sixConfigSchema,
    memoryState: sixStateSchema,
  },
  defaultValue: {
    memoryState: ({ config }) => ({
      interval: config.baseInterval,
      easeFactor: 2.5,
    }),
  },
  create({ config }) {
    const step = ({
      memoryState,
      rating,
    }: ModelStepInput<SixState, SixGrade>): SixState => {
      const prev = memoryState ?? {
        interval: config.baseInterval,
        easeFactor: 2.5,
      }
      if (rating < 3) {
        return {
          interval: config.baseInterval,
          easeFactor: Math.max(1.3, prev.easeFactor - 0.2),
        }
      }
      const factor = prev.easeFactor + (0.1 - (5 - rating) * 0.08)
      return {
        interval: Math.max(1, prev.interval * Math.max(1.3, factor)),
        easeFactor: Math.min(5, Math.max(1.3, factor)),
      }
    }
    return {
      config,
      bounds: { iMin: 0.01, iMax: 36500, eMin: 1.3, eMax: 5 },
      algorithm: null,
      step,
      nextInterval: (state, desiredRetention) =>
        Math.max(1, Math.round((state.interval * 0.9) / desiredRetention)),
      forgettingCurve: (state, elapsedDays) =>
        Math.pow(0.9, elapsedDays / Math.max(1, state.interval)),
      forward: ({ history }: ModelForwardInput<SixState, SixGrade>) => {
        const states: SixState[] = []
        let state: SixState | null = null
        for (const item of history) {
          state = step({
            memoryState: state,
            rating: item.rating,
            elapsedDays: item.deltaT,
          })
          states.push(state)
        }
        return states
      },
    }
  },
})

let _sink: unknown
function consume<T>(value: T): void {
  _sink = value
}

describe('six-grade monotonic-interval', () => {
  const core = defineScheduler({
    model: SixGradeBenchModel,
    chrono: numericChrono,
  })
    .use(
      schedulerMaximumIntervalMiddleware,
      schedulerMonotonicIntervalMiddleware
    )
    .create({
      config: { baseInterval: 1, maximumInterval: 36500 },
    })
  const reviewCard = core.review({
    card: core.newCard({ now: 0 }),
    grade: 4,
    now: 0,
  }).card

  test('six-grade monotonic-interval preview', async ({ bench }) => {
    await bench('six-grade monotonic-interval preview', () => {
      consume(Array.from(core.preview({ card: reviewCard, now: 2 })))
    }).run()
  })

  test('six-grade monotonic-interval review', async ({ bench }) => {
    await bench('six-grade monotonic-interval review', () => {
      consume(core.review({ card: reviewCard, grade: 4, now: 2 }))
    }).run()
  })
})

describe('six-grade learning-steps', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const core = defineScheduler({
    model: SixGradeBenchModel,
    chrono: dateChrono,
  })
    .use(schedulerLearningStepsMiddleware)
    .create({
      config: {
        baseInterval: 1,
        enableShortTerm: true,
        learningSteps: ['1m', '10m'],
        relearningSteps: ['10m'],
      },
    })
  const newCard = core.newCard({ now })

  test('six-grade learning-steps preview', async ({ bench }) => {
    await bench('six-grade learning-steps preview', () => {
      consume(Array.from(core.preview({ card: newCard, now })))
    }).run()
  })

  test('six-grade learning-steps review', async ({ bench }) => {
    await bench('six-grade learning-steps review', () => {
      consume(core.review({ card: newCard, grade: 4, now }))
    }).run()
  })
})

describe('six-grade Reschedule with manual entries', () => {
  const core = defineScheduler({
    model: SixGradeBenchModel,
    chrono: numericChrono,
  }).create({ config: { baseInterval: 1 } })
  const reschedule = new Reschedule(core)
  const pattern = [-1, 0, 3, 4, -1, 5, 2, 4] as const
  const history = Array.from({ length: 100 }, (_, index) => ({
    rating: pattern[index % pattern.length],
    reviewTime: index + 1,
  }))

  test('six-grade Reschedule.replay (with manual)', async ({ bench }) => {
    await bench('six-grade Reschedule.replay (with manual)', () => {
      consume(reschedule.replay({ history }).memoryState.interval)
    }).run()
  })

  test('six-grade Reschedule.reschedule (with manual)', async ({ bench }) => {
    await bench('six-grade Reschedule.reschedule (with manual)', () => {
      consume(reschedule.reschedule({ history }).card.interval)
    }).run()
  })
})

describe('two-button FSRS6 preview', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const core = defineScheduler({
    model: FSRS6Model,
    chrono: dateChrono,
    preview: { grades: [Rating.Again, Rating.Good] },
  })
    .use(
      schedulerLearningStepsMiddleware,
      schedulerMaximumIntervalMiddleware,
      schedulerMonotonicIntervalMiddleware
    )
    .create({
      config: {
        weights: FSRS6_DEFAULT_WEIGHTS,
        enableShortTerm: true,
        numRelearningSteps: 1,
        learningSteps: ['1m', '10m'],
        relearningSteps: ['10m'],
        maximumInterval: 36500,
      },
    })
  const card = core.newCard({ now })

  test('two-button FSRS6 preview', async ({ bench }) => {
    await bench('two-button FSRS6 preview', () => {
      consume(Array.from(core.preview({ card, now })))
    }).run()
  })
})

void _sink
