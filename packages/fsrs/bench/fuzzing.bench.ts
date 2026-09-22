import {
  defineScheduler,
  Rating,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { alea } from 'ts-fsrs/legacy/alea'
import { createEmptyCard } from 'ts-fsrs/legacy/default'
import { fsrs } from 'ts-fsrs/legacy/fsrs'
import {
  type FuzzingRng,
  fnv1aMulberry32Rng,
  withFuzzing,
} from 'ts-fsrs/middlewares/fuzzing/core'
import {
  createSchedulerFuzzingMiddleware,
  schedulerFuzzingMiddleware,
} from 'ts-fsrs/middlewares/fuzzing/middleware'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6/constants'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6/model'
import { describe, test } from 'vitest'

let sink = 0

function consume(value: number): void {
  sink = (sink + value) % Number.MAX_SAFE_INTEGER
}

const aleaRng: FuzzingRng = alea

const now = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-10T00:00:00.000Z')
const cardId = 'card-0001'
const modelConfig = {
  weights: [...FSRS6_DEFAULT_WEIGHTS],
  enableShortTerm: false,
  numRelearningSteps: 0,
}
const fuzzingConfig = {
  enableFuzz: true,
  maximumInterval: 36_500,
}
const disabledFuzzingConfig = { ...fuzzingConfig, enableFuzz: false }

describe('fuzzing core', () => {
  const seed = `${cardId}2`

  test('disabled', async ({ bench }) => {
    await bench('disabled', () => {
      consume(withFuzzing(30, 9, disabledFuzzingConfig, seed))
    }).run()
  })

  test('enabled', async ({ bench }) => {
    await bench('enabled', () => {
      consume(withFuzzing(30, 9, fuzzingConfig, seed))
    }).run()
  })
})

describe('fuzzing rng', () => {
  const seed = `${cardId}2`

  test('fnv1a32 + mulberry32 (default)', async ({ bench }) => {
    await bench('fnv1a32 + mulberry32 (default)', () => {
      consume(fnv1aMulberry32Rng(seed)())
    }).run()
  })

  test('alea', async ({ bench }) => {
    await bench('alea', () => {
      consume(aleaRng(seed)())
    }).run()
  })
})

describe('fuzzing scheduler', () => {
  const statsCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerStatsMiddleware)
    .create({ config: modelConfig })
  const disabledCore = defineScheduler({
    model: FSRS6Model,
    chrono: dateChrono,
  })
    .use(schedulerFuzzingMiddleware, schedulerStatsMiddleware)
    .create({
      config: { ...modelConfig, ...fuzzingConfig, enableFuzz: false },
    })
  const enabledCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerFuzzingMiddleware, schedulerStatsMiddleware)
    .create({ config: { ...modelConfig, ...fuzzingConfig } })
  const aleaCore = defineScheduler({
    model: FSRS6Model,
    chrono: dateChrono,
  })
    .use(
      createSchedulerFuzzingMiddleware({ rng: aleaRng }),
      schedulerStatsMiddleware
    )
    .create({ config: { ...modelConfig, ...fuzzingConfig } })

  const statsCard = statsCore.review({
    card: statsCore.newCard({ now }),
    grade: Rating.Good,
    now,
  }).card
  const disabledCard = disabledCore.review({
    card: disabledCore.newCard({ now, cardId }),
    grade: Rating.Good,
    now,
  }).card
  const enabledCard = enabledCore.review({
    card: enabledCore.newCard({ now, cardId }),
    grade: Rating.Good,
    now,
  }).card
  const aleaCard = aleaCore.review({
    card: aleaCore.newCard({ now, cardId }),
    grade: Rating.Good,
    now,
  }).card

  const legacy = fsrs({
    enable_fuzz: true,
    enable_short_term: false,
  })
  const legacyCard = legacy.next(createEmptyCard(now), now, Rating.Good).card

  test('newCard with generated UUID', async ({ bench }) => {
    await bench('newCard with generated UUID', () => {
      consume(Number(enabledCore.newCard({ now }).cardId !== ''))
    }).run()
  })

  test('newCard with explicit cardId', async ({ bench }) => {
    await bench('newCard with explicit cardId', () => {
      consume(Number(enabledCore.newCard({ now, cardId }).cardId === cardId))
    }).run()
  })

  test('review existing card (stats only)', async ({ bench }) => {
    await bench('review existing card (stats only)', () => {
      consume(
        statsCore
          .review({ card: statsCard, grade: Rating.Good, now: later })
          .card.dueAt.getTime()
      )
    }).run()
  })

  test('review existing card (fuzz disabled)', async ({ bench }) => {
    await bench('review existing card (fuzz disabled)', () => {
      consume(
        disabledCore
          .review({
            card: disabledCard,
            grade: Rating.Good,
            now: later,
          })
          .card.dueAt.getTime()
      )
    }).run()
  })

  test('review existing card (fuzz enabled)', async ({ bench }) => {
    await bench('review existing card (fuzz enabled)', () => {
      consume(
        enabledCore
          .review({
            card: enabledCard,
            grade: Rating.Good,
            now: later,
          })
          .card.dueAt.getTime()
      )
    }).run()
  })

  test('review existing card (alea)', async ({ bench }) => {
    await bench('review existing card (alea)', () => {
      consume(
        aleaCore
          .review({
            card: aleaCard,
            grade: Rating.Good,
            now: later,
          })
          .card.dueAt.getTime()
      )
    }).run()
  })

  test('legacy next existing card (fuzz enabled)', async ({ bench }) => {
    await bench('legacy next existing card (fuzz enabled)', () => {
      consume(legacy.next(legacyCard, later, Rating.Easy).card.due.getTime())
    }).run()
  })

  test('legacy repeat existing card (fuzz enabled)', async ({ bench }) => {
    await bench('legacy repeat existing card (fuzz enabled)', () => {
      consume(legacy.repeat(legacyCard, later)[Rating.Easy].card.due.getTime())
    }).run()
  })

  test('middleware preview existing card (fuzz enabled)', async ({ bench }) => {
    await bench('middleware preview existing card (fuzz enabled)', () => {
      for (const item of enabledCore.preview({
        card: enabledCard,
        now: later,
      })) {
        consume(item.card.dueAt.getTime())
      }
    }).run()
  })
})
