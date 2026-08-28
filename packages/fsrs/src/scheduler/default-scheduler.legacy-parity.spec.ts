import { grades, states } from '@open-spaced-repetition/srs-kit'
import {
  DefaultScheduler,
  type DefaultSchedulerOptions,
  type Grade,
  Rating,
  State,
} from 'ts-fsrs'
import {
  expectFullParity,
  expectRevlogParity,
  expectRollbackParity,
  expectSequenceParity,
  legacyNext,
  legacyReview,
  legacyRollback,
} from './default-scheduler.legacy-test-utils.js'
import {
  createStateCard,
  DAY,
  NOW,
  scheduleStatusByState,
} from './default-scheduler.test-utils.js'

const cardKeys = [
  'cardId',
  'difficulty',
  'dueAt',
  'lapses',
  'lastReviewAt',
  'learningStep',
  'reps',
  'scheduleStatus',
  'scheduledDays',
  'stability',
  'state',
] as const
const revlogKeys = [
  'cardId',
  'difficulty',
  'dueAt',
  'learningStep',
  'rating',
  'reviewTime',
  'scheduleStatus',
  'scheduledDays',
  'stability',
  'state',
] as const

describe('DefaultScheduler legacy parity', () => {
  describe.each([
    true,
    false,
  ])('field parity with enableShortTerm=%s', (enableShortTerm) => {
    const options = { enableShortTerm } satisfies DefaultSchedulerOptions

    it.each(
      grades
    )('matches every card and revlog field for rating %s', async (grade) => {
      const scheduler = await DefaultScheduler(options)
      const card = createStateCard(State.Review)
      const actual = scheduler.review({ card, grade, now: NOW })
      const legacy = legacyNext(options, card, NOW, grade)

      expect(Object.keys(actual.card).sort()).toEqual(cardKeys)
      expect(actual.card.cardId).toBe(card.cardId)
      expect(actual.card.dueAt).toEqual(legacy.card.due)
      expect(actual.card.stability).toBe(legacy.card.stability)
      expect(actual.card.difficulty).toBe(legacy.card.difficulty)
      expect(actual.card.scheduledDays).toBe(legacy.card.scheduled_days)
      expect(actual.card.learningStep).toBe(legacy.card.learning_steps)
      expect(actual.card.reps).toBe(legacy.card.reps)
      expect(actual.card.lapses).toBe(legacy.card.lapses)
      expect(actual.card.state).toBe(legacy.card.state)
      expect(actual.card.scheduleStatus).toBe(
        scheduleStatusByState[legacy.card.state]
      )
      expect(actual.card.lastReviewAt).toEqual(legacy.card.last_review ?? null)

      expect(Object.keys(actual.revlog).sort()).toEqual(revlogKeys)
      expect(actual.revlog.cardId).toBe(card.cardId)
      expect(actual.revlog.dueAt).toEqual(legacy.log.due)
      expect(actual.revlog.stability).toBe(legacy.log.stability)
      expect(actual.revlog.difficulty).toBe(legacy.log.difficulty)
      expect(actual.revlog.scheduledDays).toBe(legacy.log.scheduled_days)
      expect(actual.revlog.learningStep).toBe(legacy.log.learning_steps)
      expect(actual.revlog.rating).toBe(legacy.log.rating)
      expect(actual.revlog.state).toBe(legacy.log.state)
      expect(actual.revlog.scheduleStatus).toBe(
        scheduleStatusByState[legacy.log.state]
      )
      expect(actual.revlog.reviewTime).toEqual(legacy.log.review)
    })
  })

  describe.each([
    { name: 'short-term', enableShortTerm: true },
    { name: 'long-term', enableShortTerm: false },
  ])('$name legacy parity', ({ enableShortTerm }) => {
    const options = { enableShortTerm } satisfies DefaultSchedulerOptions

    it.each(states)('matches every rating from state %s', async (state) => {
      const card = createStateCard(state)
      const actual = Array.from(
        (await DefaultScheduler(options)).preview({ card, now: NOW })
      )

      expect(actual.map((item) => item.grade)).toEqual(grades)
      for (const [index, grade] of grades.entries()) {
        const expected = legacyReview(options, card, NOW, grade)
        if (
          !enableShortTerm &&
          (state === State.Learning || state === State.Relearning)
        ) {
          expect(actual[index].card).toEqual({
            ...expected.card,
            dueAt: actual[index].card.dueAt,
            lapses: card.lapses,
            scheduledDays: actual[index].card.scheduledDays,
          })
          expect(actual[index].card.scheduledDays).toBeLessThanOrEqual(
            expected.card.scheduledDays
          )
          expectRevlogParity(actual[index].revlog, expected.revlog)
        } else {
          expectFullParity(actual[index], expected)
        }
      }

      if (state === State.New) {
        expect(actual.every((item) => +item.revlog.dueAt === +card.dueAt)).toBe(
          true
        )
        expect(+card.dueAt).not.toBe(+NOW)
      }
    })

    it('matches a multi-round review sequence', async () => {
      const scheduler = await DefaultScheduler(options)
      const ratings = [
        Rating.Again,
        Rating.Hard,
        Rating.Good,
        Rating.Again,
        Rating.Easy,
        Rating.Good,
        Rating.Hard,
        Rating.Easy,
      ] as const satisfies readonly Grade[]
      let card = scheduler.newCard({
        now: NOW,
        cardId: `multi-${enableShortTerm}`,
      })
      let now = NOW

      for (const [index, grade] of ratings.entries()) {
        const expected = legacyReview(options, card, now, grade)
        const actual = scheduler.review({ card, grade, now })
        expectSequenceParity(actual, expected, card, enableShortTerm)
        card = actual.card
        now = new Date(card.dueAt.getTime() + (index % 2 === 0 ? 0 : DAY))
      }
    })

    it('matches 200 fixed-seed randomized review rounds', async () => {
      const scheduler = await DefaultScheduler(options)
      let seed = enableShortTerm ? 0x6f6e : 0x6f66
      let card = scheduler.newCard({
        now: NOW,
        cardId: `random-${enableShortTerm}`,
      })
      let now = NOW

      const random = () => {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
        return seed / 0x1_0000_0000
      }

      for (let round = 0; round < 200; round += 1) {
        const grade = grades[Math.floor(random() * grades.length)]
        const expected = legacyReview(options, card, now, grade)
        const actual = scheduler.review({ card, grade, now })

        expectSequenceParity(actual, expected, card, enableShortTerm)
        expectRollbackParity(
          scheduler.rollback(actual),
          legacyRollback(options, expected)
        )

        card = actual.card
        const delay = Math.floor(random() * 15) * DAY
        const hourOffset = Math.floor(random() * 24) * (DAY / 24)
        now = new Date(card.dueAt.getTime() + delay + hourOffset)
      }
    })

    it.each(
      states
    )('rolls state %s back to the legacy input', async (state) => {
      const scheduler = await DefaultScheduler(options)
      const card = createStateCard(state)

      for (const grade of grades) {
        const reviewed = scheduler.review({ card, grade, now: NOW })
        expectRollbackParity(scheduler.rollback(reviewed), card)
      }
    })
  })

  describe.each([
    {
      name: 'short-term without learning steps',
      options: {
        enableShortTerm: true,
        learningSteps: [],
        relearningSteps: [],
      },
    },
    {
      name: 'short-term with day-scale learning steps',
      options: {
        enableShortTerm: true,
        learningSteps: ['1.5d'],
        relearningSteps: ['2d'],
      },
    },
    {
      name: 'short-term with zero-minute learning steps',
      options: {
        enableShortTerm: true,
        learningSteps: ['0m'],
        relearningSteps: ['0m'],
      },
    },
    {
      name: 'short-term with a small maximum interval',
      options: {
        enableShortTerm: true,
        maximumInterval: 2,
      },
    },
    {
      name: 'long-term with a small maximum interval',
      options: {
        enableShortTerm: false,
        maximumInterval: 2,
      },
    },
    {
      name: 'long-term with high requested retention',
      options: {
        enableShortTerm: false,
        desiredRetention: 0.99,
      },
    },
  ] as const)('parameter edge parity: $name', ({ options }) => {
    it.each(states)('matches every rating from state %s', async (state) => {
      const card = createStateCard(state)
      const scheduler = await DefaultScheduler(options)

      for (const grade of grades) {
        const expected = legacyReview(options, card, NOW, grade)
        const actual = scheduler.review({ card, grade, now: NOW })

        if (
          options.enableShortTerm &&
          options.maximumInterval === 2 &&
          expected.card.scheduledDays > options.maximumInterval
        ) {
          expect(actual.card).toEqual({
            ...expected.card,
            dueAt: new Date(NOW.getTime() + 2 * DAY),
            scheduledDays: options.maximumInterval,
          })
          expectRevlogParity(actual.revlog, expected.revlog)
          continue
        }
        if (
          !options.enableShortTerm &&
          (state === State.Learning || state === State.Relearning)
        ) {
          expect(actual.card).toEqual({
            ...expected.card,
            dueAt: actual.card.dueAt,
            lapses: card.lapses,
            scheduledDays: actual.card.scheduledDays,
          })
          expect(actual.card.scheduledDays).toBeLessThanOrEqual(
            expected.card.scheduledDays
          )
          expectRevlogParity(actual.revlog, expected.revlog)
          continue
        }
        if (options.enableShortTerm && state === State.New) {
          expect(actual.card).toEqual({
            ...expected.card,
            dueAt: actual.card.dueAt,
            scheduledDays: actual.card.scheduledDays,
          })
          expect(actual.card.scheduledDays).toBeGreaterThanOrEqual(
            expected.card.scheduledDays
          )
          expectRevlogParity(actual.revlog, expected.revlog)
          continue
        }
        expectFullParity(actual, expected)
      }
    })
  })

  describe('legacy card compatibility', () => {
    it.each([
      2.5, -1,
    ])('consumes legacy scheduledDays=%s without losing rollback parity', async (scheduledDays) => {
      const options = { enableShortTerm: true }
      const scheduler = await DefaultScheduler(options)
      const card = {
        ...createStateCard(State.Review),
        cardId: `legacy-scheduled-${scheduledDays}`,
        scheduledDays,
      }
      const expected = legacyReview(options, card, NOW, Rating.Good)
      const actual = scheduler.review({
        card,
        grade: Rating.Good,
        now: NOW,
      })

      expectFullParity(actual, expected)
      expectRollbackParity(
        scheduler.rollback(actual),
        legacyRollback(options, expected)
      )
      expect(scheduler.rollback(actual).scheduledDays).toBe(scheduledDays)
    })

    it('keeps scheduledDays aligned with the second-precision learning-step due', async () => {
      const options = {
        enableShortTerm: true,
        learningSteps: ['23.999h'],
        relearningSteps: ['47.999h'],
      } satisfies DefaultSchedulerOptions
      const scheduler = await DefaultScheduler(options)

      for (const [
        state,
        expectedSeconds,
        expectedDays,
        expectedState,
        expectedScheduleStatus,
      ] of [
        [State.New, 86_396, 0, State.Learning, 'learning'],
        [State.Review, 172_796, 1, State.Review, 'review'],
      ] as const) {
        const card = createStateCard(state)
        const actual = scheduler.review({
          card,
          grade: Rating.Again,
          now: NOW,
        })
        const legacy = legacyReview(options, card, NOW, Rating.Again)

        expect(actual.card.dueAt.getTime() - NOW.getTime()).toBe(
          expectedSeconds * 1_000
        )
        expect(actual.card.scheduledDays).toBe(expectedDays)
        expect(actual.card.state).toBe(expectedState)
        expect(actual.card.scheduleStatus).toBe(expectedScheduleStatus)
        expect(legacy.card.scheduledDays).toBe(expectedDays)
      }
    })
  })
})
