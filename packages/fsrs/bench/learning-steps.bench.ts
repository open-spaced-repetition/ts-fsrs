import {
  defineScheduler,
  grades,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { createEmptyCard } from 'ts-fsrs/legacy/default'
import { fsrs } from 'ts-fsrs/legacy/fsrs'
import {
  ConvertStepUnitToMinutes,
  calculateLearningSteps,
} from 'ts-fsrs/middlewares/learning-steps/core'
import { schedulerLearningStepsMiddleware } from 'ts-fsrs/middlewares/learning-steps/middleware'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6/index'
import { bench, describe } from 'vitest'

let sink = 0

function consume(value: number): void {
  sink = (sink + value) % Number.MAX_SAFE_INTEGER
}

const learningSteps = ['1m', '10m'] as const
const relearningSteps = ['10m', '20m'] as const
const learningConfig = {
  learningSteps,
  relearningSteps,
}
describe('learning-steps core', () => {
  bench('convert decimal step', () => {
    consume(ConvertStepUnitToMinutes('1.5h'))
  })

  bench('calculate new two-step schedule', () => {
    consume(
      calculateLearningSteps(learningConfig, State.New, 0)[Rating.Good]
        ?.scheduledMinutes ?? 0
    )
  })

  bench('calculate relearning two-step schedule', () => {
    consume(
      calculateLearningSteps(learningConfig, State.Relearning, 0)[Rating.Good]
        ?.scheduledMinutes ?? 0
    )
  })

  bench('calculate preview without shared result', () => {
    for (const grade of grades) {
      consume(
        calculateLearningSteps(learningConfig, State.New, 0)[grade]
          ?.scheduledMinutes ?? 0
      )
    }
  })

  bench('calculate preview with shared result', () => {
    const steps = calculateLearningSteps(learningConfig, State.New, 0)
    for (const grade of grades) {
      consume(steps[grade]?.scheduledMinutes ?? 0)
    }
  })
})

describe('legacy FSRS vs scheduler middleware', () => {
  const now = new Date(2022, 11, 29, 12, 30)
  const legacy = fsrs({
    enable_fuzz: false,
    learning_steps: learningSteps,
    relearning_steps: relearningSteps,
  })
  const legacyCard = createEmptyCard(now)

  const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerLearningStepsMiddleware)
    .create({
      config: {
        weights: [...FSRS6_DEFAULT_WEIGHTS],
        enableShortTerm: true,
        numRelearningSteps: relearningSteps.length,
        learningSteps,
        relearningSteps,
      },
    })
  const schedulerCard = core.newCard({ now })
  const baseCore = defineScheduler({
    model: FSRS6Model,
    chrono: dateChrono,
  }).create({
    config: {
      weights: [...FSRS6_DEFAULT_WEIGHTS],
      enableShortTerm: true,
      numRelearningSteps: relearningSteps.length,
    },
  })
  const baseCard = baseCore.newCard({ now })

  bench('legacy next new card', () => {
    consume(legacy.next(legacyCard, now, Rating.Good).card.due.getTime())
  })

  bench('middleware review new card', () => {
    consume(
      core
        .review({ card: schedulerCard, grade: Rating.Good, now })
        .card.dueAt.getTime()
    )
  })

  bench('scheduler review without middleware', () => {
    consume(
      baseCore
        .review({ card: baseCard, grade: Rating.Good, now })
        .card.dueAt.getTime()
    )
  })

  bench('legacy repeat new card', () => {
    consume(legacy.repeat(legacyCard, now)[Rating.Easy].card.due.getTime())
  })

  bench('middleware preview new card', () => {
    for (const item of core.preview({ card: schedulerCard, now })) {
      consume(item.card.dueAt.getTime())
    }
  })

  bench('scheduler preview without middleware', () => {
    for (const item of baseCore.preview({ card: baseCard, now })) {
      consume(item.card.dueAt.getTime())
    }
  })
})
