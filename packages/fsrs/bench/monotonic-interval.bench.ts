import { defineScheduler, Rating } from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { createEmptyCard } from 'ts-fsrs/default'
import { fsrs } from 'ts-fsrs/fsrs'
import {
  calculateScheduleDay,
  calculateScheduleDays,
} from 'ts-fsrs/middlewares/monotonic-interval/core'
import { schedulerMonotonicIntervalMiddleware } from 'ts-fsrs/middlewares/monotonic-interval/middleware'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6/constants'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6/model'
import { bench, describe } from 'vitest'

let sink = 0

function consume(value: number): void {
  sink = (sink + value) % Number.MAX_SAFE_INTEGER
}

const maximumInterval = 36_500

describe('monotonic interval core', () => {
  bench('calculate one-rating chain', () => {
    consume(calculateScheduleDays([4], maximumInterval)[0])
  })

  bench('calculate two-rating chain', () => {
    consume(calculateScheduleDays([4, 2], maximumInterval)[1])
  })

  bench('calculate three-rating chain', () => {
    consume(calculateScheduleDays([4, 2, 7], maximumInterval)[2])
  })

  bench('calculate four-rating chain', () => {
    consume(calculateScheduleDays([4, 2, 7, 6], maximumInterval)[3])
  })

  bench('calculate current four-rating interval', () => {
    consume(calculateScheduleDay([4, 2, 7, 6], maximumInterval))
  })
})

const now = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-10T00:00:00.000Z')

const legacyLongTerm = fsrs({
  enable_fuzz: false,
  enable_short_term: false,
  maximum_interval: maximumInterval,
})
const legacyLongTermNewCard = createEmptyCard(now)
const legacyLongTermReviewCard = legacyLongTerm.next(
  legacyLongTermNewCard,
  now,
  Rating.Good
).card

const legacyShortTerm = fsrs({
  enable_fuzz: false,
  enable_short_term: true,
  maximum_interval: maximumInterval,
})
const legacyShortTermReviewCard = legacyShortTerm.next(
  createEmptyCard(now),
  now,
  Rating.Easy
).card

describe('legacy FSRS', () => {
  bench('long-term next new card', () => {
    consume(
      legacyLongTerm.next(legacyLongTermNewCard, now, Rating.Good).card
        .scheduled_days
    )
  })

  bench('long-term next review card', () => {
    consume(
      legacyLongTerm.next(legacyLongTermReviewCard, later, Rating.Easy).card
        .scheduled_days
    )
  })

  bench('long-term repeat review card', () => {
    for (const item of Array.from(
      legacyLongTerm.repeat(legacyLongTermReviewCard, later)
    )) {
      consume(item.card.scheduled_days)
    }
  })

  bench('short-term next review card', () => {
    consume(
      legacyShortTerm.next(legacyShortTermReviewCard, later, Rating.Easy).card
        .scheduled_days
    )
  })

  bench('short-term repeat review card', () => {
    for (const item of Array.from(
      legacyShortTerm.repeat(legacyShortTermReviewCard, later)
    )) {
      consume(item.card.scheduled_days)
    }
  })
})

const longTermModelConfig = {
  weights: [...FSRS6_DEFAULT_WEIGHTS],
  enableShortTerm: false,
  numRelearningSteps: 0,
}
const shortTermModelConfig = {
  weights: [...FSRS6_DEFAULT_WEIGHTS],
  enableShortTerm: true,
  numRelearningSteps: 1,
}

const longTermBaseCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).create({ config: longTermModelConfig })
const longTermBaseCard = longTermBaseCore.review({
  card: longTermBaseCore.newCard({ now }),
  grade: Rating.Good,
  now,
}).card

const longTermMonotonicCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})
  .use(schedulerMonotonicIntervalMiddleware)
  .create({
    config: { ...longTermModelConfig, maximumInterval },
  })
const longTermMonotonicCard = longTermMonotonicCore.review({
  card: longTermMonotonicCore.newCard({ now }),
  grade: Rating.Good,
  now,
}).card

const shortTermBaseCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).create({ config: shortTermModelConfig })
const shortTermBaseCard = shortTermBaseCore.review({
  card: shortTermBaseCore.newCard({ now }),
  grade: Rating.Easy,
  now,
}).card

const shortTermMonotonicCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})
  .use(schedulerMonotonicIntervalMiddleware)
  .create({
    config: { ...shortTermModelConfig, maximumInterval },
  })
const shortTermMonotonicCard = shortTermMonotonicCore.review({
  card: shortTermMonotonicCore.newCard({ now }),
  grade: Rating.Easy,
  now,
}).card

describe('srs-kit long-term review card', () => {
  bench('base review', () => {
    consume(
      longTermBaseCore
        .review({
          card: longTermBaseCard,
          grade: Rating.Easy,
          now: later,
        })
        .card.dueAt.getTime()
    )
  })

  bench('monotonic middleware review', () => {
    consume(
      longTermMonotonicCore
        .review({
          card: longTermMonotonicCard,
          grade: Rating.Easy,
          now: later,
        })
        .card.dueAt.getTime()
    )
  })

  bench('base preview', () => {
    for (const item of Array.from(
      longTermBaseCore.preview({ card: longTermBaseCard, now: later })
    )) {
      consume(item.card.dueAt.getTime())
    }
  })

  bench('monotonic middleware preview', () => {
    for (const item of Array.from(
      longTermMonotonicCore.preview({
        card: longTermMonotonicCard,
        now: later,
      })
    )) {
      consume(item.card.dueAt.getTime())
    }
  })
})

describe('srs-kit short-term review card', () => {
  bench('base review', () => {
    consume(
      shortTermBaseCore
        .review({
          card: shortTermBaseCard,
          grade: Rating.Easy,
          now: later,
        })
        .card.dueAt.getTime()
    )
  })

  bench('monotonic middleware review', () => {
    consume(
      shortTermMonotonicCore
        .review({
          card: shortTermMonotonicCard,
          grade: Rating.Easy,
          now: later,
        })
        .card.dueAt.getTime()
    )
  })

  bench('base preview', () => {
    for (const item of Array.from(
      shortTermBaseCore.preview({ card: shortTermBaseCard, now: later })
    )) {
      consume(item.card.dueAt.getTime())
    }
  })

  bench('monotonic middleware preview', () => {
    for (const item of Array.from(
      shortTermMonotonicCore.preview({
        card: shortTermMonotonicCard,
        now: later,
      })
    )) {
      consume(item.card.dueAt.getTime())
    }
  })
})
