import {
  defineScheduler,
  type Grade,
  Rating,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { FSRS6Model, migrateFSRS6Parameters } from '@/models/fsrs-6/index.js'

const FSRS6Scheduler = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})

/**
 * @see https://forums.ankiweb.net/t/feature-request-estimated-total-knowledge-over-time/53036/58?u=l.m.sherlock
 * @see https://ankiweb.net/shared/info/1613056169
 */
test('TS-FSRS-Simulator', () => {
  const scheduler = FSRS6Scheduler.create({
    config: {
      weights: migrateFSRS6Parameters([
        1.1596, 1.7974, 13.1205, 49.3729, 7.2303, 0.5081, 1.5371, 0.001, 1.5052,
        0.1261, 0.9735, 1.8924, 0.1486, 0.2407, 2.1937, 0.1518, 3.0699, 0.4636,
        0.6048,
      ]),
      enableShortTerm: true,
      numRelearningSteps: 1,
    },
  })
  const rids = [1704468957000, 1704469645000, 1704599572000, 1705509507000]

  const expected = [13.1205, 17.3668145, 21.28550751, 39.63452215]
  let card = scheduler.newCard({ now: new Date(rids[0]) })
  const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
  for (let i = 0; i < rids.length; i++) {
    const now = new Date(rids[i])
    card = scheduler.review({ card, grade: grades[i], now }).card
    expect(card.stability).toBeCloseTo(expected[i], 4)
  }
})

test('SSE use next_state', () => {
  const scheduler = FSRS6Scheduler.create({
    config: {
      weights: migrateFSRS6Parameters([
        0.4911, 4.5674, 24.8836, 77.045, 7.5474, 0.1873, 1.7732, 0.001, 1.1112,
        0.152, 0.5728, 1.8747, 0.1733, 0.2449, 2.2905, 0.0, 2.9898, 0.0883,
        0.9033,
      ]),
      enableShortTerm: true,
      numRelearningSteps: 1,
    },
  })

  const rids = [
    1698678054940 /**2023-10-30T15:00:54.940Z */,
    1698678126399 /**2023-10-30T15:02:06.399Z */,
    1698688771401 /**2023-10-30T17:59:31.401Z */,
    1698688837021 /**2023-10-30T18:00:37.021Z */,
    1698688916440 /**2023-10-30T18:01:56.440Z */,
    1698698192380 /**2023-10-30T20:36:32.380Z */,
    1699260169343 /**2023-11-06T08:42:49.343Z */,
    1702718934003 /**2023-12-16T09:28:54.003Z */,
    1704910583686 /**2024-01-10T18:16:23.686Z */,
    1713000017248 /**2024-04-13T09:20:17.248Z */,
  ]
  const ratings: Rating[] = [3, 3, 1, 3, 3, 3, 0, 3, 0, 3]
  // 0,0,0,0,0,0,47,119
  let card = scheduler.newCard({ now: new Date(rids[0]) })
  for (let i = 0; i < rids.length; i++) {
    const current = new Date(rids[i])
    const rating = ratings[i]
    if (rating === Rating.Manual) {
      continue
    }
    card = scheduler.review({ card, grade: rating, now: current }).card
  }
  expect(card.stability).toBeCloseTo(71.77)
})

test.skip('SSE 71.77', () => {
  const scheduler = FSRS6Scheduler.create({
    config: {
      weights: migrateFSRS6Parameters([
        0.4911, 4.5674, 24.8836, 77.045, 7.5474, 0.1873, 1.7732, 0.001, 1.1112,
        0.152, 0.5728, 1.8747, 0.1733, 0.2449, 2.2905, 0.0, 2.9898, 0.0883,
        0.9033,
      ]),
      enableShortTerm: true,
      numRelearningSteps: 1,
    },
  })

  const rids = [
    1698678054940 /**2023-10-30T15:00:54.940Z */,
    1698678126399 /**2023-10-30T15:02:06.399Z */,
    1698688771401 /**2023-10-30T17:59:31.401Z */,
    1698688837021 /**2023-10-30T18:00:37.021Z */,
    1698688916440 /**2023-10-30T18:01:56.440Z */,
    1698698192380 /**2023-10-30T20:36:32.380Z */,
    1699260169343 /**2023-11-06T08:42:49.343Z */,
    1702718934003 /**2023-12-16T09:28:54.003Z */,
    1704910583686 /**2024-01-10T18:16:23.686Z */,
    1713000017248 /**2024-04-13T09:20:17.248Z */,
  ]
  const ratings: Rating[] = [3, 3, 1, 3, 3, 3, 0, 3, 0, 3]

  const expected = [
    {
      s: 24.88,
      d: 7.09,
    },
    {
      s: 26.95,
      d: 7.09,
    },
    {
      s: 24.46,
      d: 8.24,
    },
    {
      s: 26.48,
      d: 8.24,
    },
    {
      s: 28.69,
      d: 8.23,
    },
    {
      s: 31.08,
      d: 8.23,
    },
    {
      s: 47.44,
      d: 8.23,
    },
    {
      s: 71.77,
      d: 8.23,
    },
  ]

  let card = scheduler.newCard({ now: new Date(rids[0]) })

  for (let i = 0; i < rids.length; i++) {
    const rating = ratings[i]
    if (rating === 0) {
      continue
    }

    const now = new Date(rids[i])
    card = scheduler.review({ card, grade: rating, now }).card
    console.debug(i + 1)
    expect(card.stability).toBeCloseTo(expected[i].s, 2)
    expect(card.difficulty).toBeCloseTo(expected[i].d, 2)
  }

  expect(card.stability).toBeCloseTo(71.77)
})
