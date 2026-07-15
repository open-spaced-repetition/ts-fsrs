import {
  defineScheduler,
  Rating,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { schedulerLeechMiddleware } from 'ts-fsrs/middlewares/leech/middleware'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6/constants'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6/model'
import { bench, describe } from 'vitest'

let sink = 0

function consume(lapses: number, scheduleStatus: string): void {
  sink =
    (sink + lapses + Number(scheduleStatus === 'suspend')) %
    Number.MAX_SAFE_INTEGER
}

const now = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-10T00:00:00.000Z')
const modelConfig = {
  weights: [...FSRS6_DEFAULT_WEIGHTS],
  enableShortTerm: false,
  numRelearningSteps: 0,
}

const statsCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
  .use(schedulerStatsMiddleware)
  .create({ config: modelConfig })
const disabledCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
  .use(schedulerLeechMiddleware, schedulerStatsMiddleware)
  .create({ config: { ...modelConfig, leechThreshold: 0 } })
const enabledCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
  .use(schedulerLeechMiddleware, schedulerStatsMiddleware)
  .create({ config: { ...modelConfig, leechThreshold: 8 } })

const statsCard = {
  ...statsCore.review({
    card: statsCore.newCard({ now }),
    grade: Rating.Good,
    now,
  }).card,
  lapses: 7,
}
const disabledCard = {
  ...disabledCore.review({
    card: disabledCore.newCard({ now }),
    grade: Rating.Good,
    now,
  }).card,
  lapses: 7,
}
const nonLeechCard = {
  ...enabledCore.review({
    card: enabledCore.newCard({ now }),
    grade: Rating.Good,
    now,
  }).card,
  lapses: 6,
}
const leechCard = { ...nonLeechCard, lapses: 7 }

describe('leech scheduler', () => {
  bench('review with stats only', () => {
    const card = statsCore.review({
      card: statsCard,
      grade: Rating.Again,
      now: later,
    }).card
    consume(card.lapses, card.scheduleStatus)
  })

  bench('review with leech disabled', () => {
    const card = disabledCore.review({
      card: disabledCard,
      grade: Rating.Again,
      now: later,
    }).card
    consume(card.lapses, card.scheduleStatus)
  })

  bench('review before leech threshold', () => {
    const card = enabledCore.review({
      card: nonLeechCard,
      grade: Rating.Again,
      now: later,
    }).card
    consume(card.lapses, card.scheduleStatus)
  })

  bench('review at leech threshold', () => {
    const card = enabledCore.review({
      card: leechCard,
      grade: Rating.Again,
      now: later,
    }).card
    consume(card.lapses, card.scheduleStatus)
  })

  bench('preview at leech threshold', () => {
    for (const item of enabledCore.preview({ card: leechCard, now: later })) {
      consume(item.card.lapses, item.card.scheduleStatus)
    }
  })
})
