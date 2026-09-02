import {
  createEmptyCard,
  dateChrono,
  defineScheduler,
  FSRS,
  type Grade,
  Grades,
  generatorParameters,
  Rating,
  State,
} from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS5Model } from 'ts-fsrs/models/fsrs-5'

const w = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
]

const FSRS5Scheduler = defineScheduler({
  model: FSRS5Model,
  chrono: dateChrono,
}).use(
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware
)

const createFSRS5Scheduler = (enableShortTerm = true) =>
  FSRS5Scheduler.create({
    config: {
      weights: w,
      enableShortTerm,
      desiredRetention: 0.9,
      enableFuzz: false,
      maximumInterval: 36500,
      learningSteps: ['1m', '10m'],
      relearningSteps: ['10m'],
    },
  })

describe('FSRS-5', () => {
  const scheduler = createFSRS5Scheduler()
  it('ivl_history', () => {
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    let card = scheduler.newCard({ now })
    const ratings: Grade[] = [
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Again,
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const ivl_history: number[] = []
    for (const rating of ratings) {
      let selectedCard = card
      for (const schedulingCard of scheduler.preview({ card, now })) {
        const check = schedulingCard.grade
        const rollbackCard = scheduler.rollback({
          card: schedulingCard.card,
          revlog: schedulingCard.revlog,
        })
        expect(rollbackCard).toEqual(card)
        const next = scheduler.review({ card, now, grade: check })
        expect({
          card: schedulingCard.card,
          revlog: schedulingCard.revlog,
        }).toEqual(next)
        if (check === rating) {
          selectedCard = schedulingCard.card
        }
      }
      card = selectedCard
      const ivl = card.scheduledDays
      ivl_history.push(ivl)
      now = card.dueAt
    }
    expect(ivl_history).toEqual([
      0, 4, 14, 44, 125, 328, 0, 0, 7, 16, 34, 71, 142,
    ])
  })

  describe('memory state', () => {
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const intervals: number[] = [0, 0, 1, 3, 8, 21]
    function assertMemoryState(
      scheduler: ReturnType<typeof createFSRS5Scheduler>,
      expect_stability: number,
      expect_difficulty: number
    ) {
      let now = new Date(2022, 11, 29, 12, 30, 0, 0)
      let card = scheduler.newCard({ now })

      for (const [index, rating] of ratings.entries()) {
        now = new Date(+now + intervals[index] * 24 * 60 * 60 * 1000)
        card = scheduler.review({ card, now, grade: rating }).card
      }

      const { stability, difficulty } = card
      expect(stability).toBeCloseTo(expect_stability, 4)
      expect(difficulty).toBeCloseTo(expect_difficulty, 4)
    }
    it('memory state[short-term]', () => {
      assertMemoryState(createFSRS5Scheduler(true), 48.26549438, 7.10441712)
    })
    it('memory state[long-term]', () => {
      assertMemoryState(createFSRS5Scheduler(false), 48.065163, 7.10441712)
    })
  })

  it('first repeat', () => {
    const now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const card = scheduler.newCard({ now })
    const schedulingCards = scheduler.preview({ card, now })

    const stability: number[] = []
    const difficulty: number[] = []
    const scheduled_days: number[] = []
    const reps: number[] = []
    const lapses: number[] = []
    const states: State[] = []
    for (const item of schedulingCards) {
      const first_card = item.card
      stability.push(first_card.stability)
      difficulty.push(first_card.difficulty)
      reps.push(first_card.reps)
      lapses.push(first_card.lapses)
      scheduled_days.push(first_card.scheduledDays)
      states.push(first_card.state)
    }
    expect(stability).toEqual([0.40255, 1.18385, 3.173, 15.69105])
    expect(difficulty).toEqual([7.1949, 6.48830527, 5.28243442, 3.22450159])
    expect(reps).toEqual([1, 1, 1, 1])
    expect(lapses).toEqual([0, 0, 0, 0])
    expect(scheduled_days).toEqual([0, 0, 0, 16])
    expect(states).toEqual([
      State.Learning,
      State.Learning,
      State.Learning,
      State.Review,
    ])
  })
})

describe('get retrievability', () => {
  const fsrs = new FSRS()
  test('return 0 for new cards', () => {
    const card = createEmptyCard()
    const now = new Date()
    expect(fsrs.retrievability(card, now)).toBe(0)
  })

  test('return retrievability percentage for review cards', () => {
    const card = createEmptyCard('2023-12-01 04:00:00')
    const sc = fsrs.repeat(card, '2023-12-01 04:05:00')

    const r_number = [1, 1, 1, 0.9024733]
    Grades.forEach((grade, index) => {
      expect(fsrs.retrievability(sc[grade].card, sc[grade].card.due)).toBe(
        r_number[index]
      )
    })
  })

  test('fake the current system time', () => {
    const card = createEmptyCard('2023-12-01 04:00:00')
    const sc = fsrs.repeat(card, '2023-12-01 04:05:00')
    const r_number = [1, 1, 1, 0.9024733]
    vi.useFakeTimers()
    Grades.forEach((grade, index) => {
      vi.setSystemTime(sc[grade].card.due)
      expect(fsrs.retrievability(sc[grade].card, undefined)).toBe(
        r_number[index]
      )
    })
    vi.useRealTimers()
  })

  test('loop Again', () => {
    const fsrs = new FSRS(generatorParameters())
    let card = createEmptyCard()
    let now = new Date()
    let i = 0
    while (i < 5) {
      card = fsrs.next(card, now, Rating.Again).card
      now = card.due
      i++

      const r = fsrs.retrievability(card, now)
      console.debug(`Loop ${i}: s:${card.stability} r:${r} `)

      expect(r).not.toBeNaN()
    }
  })
})

describe('fsrs.next method', () => {
  const fsrs = new FSRS({})
  test('invalid grade', () => {
    const card = createEmptyCard()
    const now = new Date()
    const g = Rating.Manual as unknown as Grade
    expect(() => fsrs.next(card, now, g)).toThrow(
      'Cannot review a manual rating'
    )
  })
})
