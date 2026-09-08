import {
  defineScheduler,
  type Grade,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  FSRS7_DEFAULT_WEIGHTS,
  type FSRS7Config,
  FSRS7Model,
  type FSRS7State,
} from '@/models/fsrs-7/index.js'
import { Reschedule } from '@/reschedule/index.js'
import {
  DefaultScheduler,
  type DefaultSchedulerCard,
  type DefaultSchedulerRevlog,
} from './default-scheduler.js'

// Reference: fsrs-rs c9562d6 and srs-benchmark b4b0254, evaluated in float32.
// biome-ignore format: compact independent reference values.
const referenceHistories = [
  {"history":[{"deltaT":0,"rating":1},{"deltaT":0,"rating":3},{"deltaT":1,"rating":3},{"deltaT":3,"rating":3},{"deltaT":8,"rating":3},{"deltaT":21,"rating":3}],"states":[{"stability":0.1104,"stabilityFast":0.08832,"difficulty":6.1686},{"stability":0.11041191,"stabilityFast":0.08832,"difficulty":6.109214},{"stability":0.91686124,"stabilityFast":44.444206,"difficulty":6.0504217},{"stability":3.5337858,"stabilityFast":193.5973,"difficulty":5.9922175},{"stability":10.186002,"stabilityFast":407.62646,"difficulty":5.934595},{"stability":25.985723,"stabilityFast":700.5589,"difficulty":5.877549}]},
  {"history":[{"deltaT":0,"rating":1},{"deltaT":0.99791664,"rating":1},{"deltaT":0.82361114,"rating":1},{"deltaT":1.0388889,"rating":1},{"deltaT":0.0013888889,"rating":3},{"deltaT":0.0020833334,"rating":3},{"deltaT":0.0020833334,"rating":3},{"deltaT":0.0027777778,"rating":3}],"states":[{"stability":0.1104,"stabilityFast":0.08832,"difficulty":6.1686},{"stability":0.06706447,"stabilityFast":0.016565936,"difficulty":8.047908},{"stability":0.04536918,"stabilityFast":0.0034119464,"difficulty":8.764432},{"stability":0.0329967,"stabilityFast":0.00074974925,"difficulty":9.098293},{"stability":0.14780034,"stabilityFast":2.8802187,"difficulty":9.009611},{"stability":0.24254547,"stabilityFast":7.019944,"difficulty":8.921815},{"stability":0.3307042,"stabilityFast":10.166433,"difficulty":8.834897},{"stability":0.4365655,"stabilityFast":13.619719,"difficulty":8.748848}]},
  {"history":[{"deltaT":0,"rating":4},{"deltaT":0.001,"rating":2},{"deltaT":0.25,"rating":1},{"deltaT":0,"rating":3},{"deltaT":1.5,"rating":4},{"deltaT":2.75,"rating":2},{"deltaT":100.5,"rating":1}],"states":[{"stability":11.7841,"stabilityFast":9.427279,"difficulty":1},{"stability":12.22947,"stabilityFast":13.9512825,"difficulty":4.636193},{"stability":2.6588404,"stabilityFast":0.3485167,"difficulty":9.259369},{"stability":2.6589437,"stabilityFast":0.3485167,"difficulty":9.169076},{"stability":5.028668,"stabilityFast":25.826185,"difficulty":8.743264},{"stability":7.37282,"stabilityFast":65.00047,"difficulty":9.166955},{"stability":2.3163264,"stabilityFast":0.89478546,"difficulty":9.615685}]}
]

const now = new Date('2026-09-08T23:59:00Z')
const MS_PER_DAY = 86400000

describe('DefaultScheduler FSRS-7', () => {
  it('exposes the FSRS-7 model config without legacy model fields', async () => {
    const scheduler = await DefaultScheduler({ version: 'FSRS-7' })
    expectTypeOf(scheduler.model.config).toEqualTypeOf<FSRS7Config>()
    expectTypeOf<
      keyof typeof scheduler.model.config
    >().toEqualTypeOf<'weights'>()
    expect(scheduler.model.config).toEqual({
      weights: [...FSRS7_DEFAULT_WEIGHTS],
    })
    expect(scheduler.config.enableShortTerm).toBe(true)
  })
  it('configures fractional days through the shared Date chrono definition', async () => {
    const scheduler = await DefaultScheduler({ version: 'FSRS-7' })
    expect(scheduler.definition.chrono).toBe(dateChrono)
    expect(scheduler.config.fractionalDays).toBe(true)
    const legacy = await DefaultScheduler()
    expect(legacy.config.fractionalDays).toBe(false)
    const definition = defineScheduler({
      model: FSRS7Model,
      chrono: dateChrono,
    })
    const fractional = definition.create({
      config: {
        weights: FSRS7_DEFAULT_WEIGHTS,
        fractionalDays: true,
      },
    })
    const calendar = definition.create({
      config: { weights: FSRS7_DEFAULT_WEIGHTS },
    })
    const later = new Date(now.getTime() + 120000)
    expect(fractional.chrono.difference(now, later)).toBe(2 / 1440)
    expect(calendar.chrono.difference(now, later)).toBe(1)
    expect(() =>
      definition.create({
        config: {
          weights: FSRS7_DEFAULT_WEIGHTS,
          fractionalDays: 'true',
        } as never,
      })
    ).toThrow('fractionalDays')
  })
  it('migrates full review history through Reschedule without losing the fast trace', async () => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      learningSteps: [],
      relearningSteps: [],
    })
    const reschedule = new Reschedule(scheduler)
    let time = now.getTime()
    const source = referenceHistories[2]
    const history = source.history.map(({ rating, deltaT }) => {
      time += Math.round(deltaT * MS_PER_DAY)
      return { rating: rating as Grade, reviewTime: new Date(time) }
    })
    const replay = reschedule.replay({ history })
    const scheduled = reschedule.reschedule({ history })
    expectTypeOf(replay.memoryState).toEqualTypeOf<FSRS7State>()
    expectTypeOf(replay.memoryStates).toEqualTypeOf<FSRS7State[]>()
    expect(scheduled.card).toMatchObject(replay.memoryState)
    for (const [index, state] of replay.memoryStates.entries()) {
      for (const key of ['stability', 'stabilityFast', 'difficulty'] as const) {
        expect(
          Math.abs(state[key] - source.states[index][key])
        ).toBeLessThanOrEqual(Math.max(1e-7, source.states[index][key] * 1e-4))
      }
    }
  })
  it('preserves all three memory fields in cards, revlogs, schemas, and rollback', async () => {
    const scheduler = await DefaultScheduler({ version: 'FSRS-7' })
    const card = scheduler.newCard({ now, cardId: 'fsrs7' })
    expectTypeOf(card.stabilityFast).toEqualTypeOf<number>()
    expectTypeOf(card).toEqualTypeOf<DefaultSchedulerCard<'FSRS-7'>>()
    expect(card.stabilityFast).toBe(0)
    const result = scheduler.review({ card, now, grade: Rating.Good })
    expectTypeOf(result.revlog).toEqualTypeOf<
      DefaultSchedulerRevlog<'FSRS-7'>
    >()
    expect(result.card.stabilityFast).toBeCloseTo(
      FSRS7_DEFAULT_WEIGHTS[2] * 0.8,
      10
    )
    expect(result.revlog.stabilityFast).toBe(0)
    expect(result.card.learningStep).toBe(1)
    expect(result.card.scheduledDays).toBe(10 / 1440)
    expect(scheduler.rollback(result)).toEqual(card)
    const forgotten = scheduler.forget({ card: result.card, now })
    expect(forgotten.stabilityFast).toBe(0)
  })

  it.each([
    false,
    true,
  ])('replays fractional histories with enableShortTerm=%s', async (enableShortTerm) => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm,
      learningSteps: [],
      relearningSteps: [],
    })
    for (const test of referenceHistories) {
      let time = now
      let card = scheduler.newCard({ now: time, cardId: 'history' })
      const results = []
      for (const [index, review] of test.history.entries()) {
        time = new Date(time.getTime() + Math.round(review.deltaT * MS_PER_DAY))
        const result = scheduler.review({
          card,
          now: time,
          grade: review.rating as Grade,
        })
        for (const key of [
          'stability',
          'stabilityFast',
          'difficulty',
        ] as const) {
          const expected = test.states[index][key]
          expect(Math.abs(result.card[key] - expected)).toBeLessThanOrEqual(
            Math.max(1e-7, expected * 1e-4)
          )
        }
        expect(result.revlog.stabilityFast).toBe(card.stabilityFast)
        expect(result.revlog.scheduledDays).toBe(card.scheduledDays)
        // Existing Date rollback makes a reviewed card due at the undone review time.
        expect(scheduler.rollback(result)).toEqual({
          ...card,
          dueAt: card.state === State.New ? card.dueAt : time,
        })
        results.push(result)
        card = result.card
      }
      // Revlog before-images restore the sequence's memory state, including both traces.
      for (const result of results.reverse()) {
        card = scheduler.rollback({ card, revlog: result.revlog })
      }
      expect(card).toEqual(scheduler.newCard({ now, cardId: 'history' }))
    }
  })

  it('uses fractional elapsed days across midnight and distinguishes reviews within one day', async () => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm: false,
    })
    const first = scheduler.review({
      card: scheduler.newCard({ now }),
      now,
      grade: Rating.Again,
    })
    const later = new Date(now.getTime() + 2 * 60000)
    const result = scheduler.review({
      card: first.card,
      now: later,
      grade: Rating.Good,
    })
    const expected = scheduler.model.step({
      memoryState: first.card,
      elapsedDays: 2 / 1440,
      rating: Rating.Good,
    })
    expect(result.card.stability).toBe(expected.stability)
    expect(result.card.stabilityFast).toBe(expected.stabilityFast)
    expect(result.card).not.toMatchObject(
      scheduler.model.step({
        memoryState: first.card,
        elapsedDays: 1,
        rating: Rating.Good,
      })
    )
  })

  it.each([
    false,
    true,
  ])('keeps model sub-day intervals positive with enableFuzz=%s', async (enableFuzz) => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm: false,
      enableFuzz,
    })
    const card = scheduler.newCard({ now, cardId: 'fractional' })
    const result = scheduler.review({ card, now, grade: Rating.Again })
    const interval = scheduler.model.nextInterval(result.card, 0.9)
    expect(interval).toBeGreaterThan(0)
    expect(interval).toBeLessThan(1)
    expect(result.card.scheduledDays).toBe(interval)
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(
      Math.trunc(interval * MS_PER_DAY)
    )
    expect(result.card.state).toBe(State.Review)
    const previews = Array.from(scheduler.preview({ card, now }))
    for (const preview of previews) {
      expect(preview.card).toEqual(
        scheduler.review({ card, now, grade: preview.grade }).card
      )
    }
  })

  it.each([
    '0m',
    '0.001m',
    '0.01m',
    '1439.6m',
    '1440m',
  ] as const)('only a positive second-rounded explicit step overrides the model (%s)', async (step) => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      learningSteps: [step],
      enableFuzz: true,
    })
    const card = scheduler.newCard({ now })
    const result = scheduler.review({ card, now, grade: Rating.Again })
    const minutes = Math.round(Number.parseFloat(step) * 60) / 60
    if (minutes > 0) {
      expect(result.card.scheduledDays).toBe(minutes / 1440)
      expect(result.card.dueAt.getTime() - now.getTime()).toBe(
        Math.round(minutes * 60000)
      )
      expect(result.card.state).toBe(
        minutes < 1440 ? State.Learning : State.Review
      )
    } else {
      expect(result.card.scheduledDays).toBe(
        scheduler.model.nextInterval(result.card, 0.9)
      )
      expect(result.card.state).toBe(State.Review)
    }
    expect(result.card.learningStep).toBe(0)
    expect(scheduler.rollback(result)).toEqual(card)
  })

  it('graduates a completed step even when the model interval is below one day', async () => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      desiredRetention: 0.99,
      learningSteps: ['1m'],
    })
    const first = scheduler.review({
      card: scheduler.newCard({ now }),
      now,
      grade: Rating.Again,
    })
    const result = scheduler.review({
      card: first.card,
      now: first.card.dueAt,
      grade: Rating.Good,
    })
    expect(result.card.scheduledDays).toBeGreaterThan(0)
    expect(result.card.scheduledDays).toBeLessThan(1)
    expect(result.card.state).toBe(State.Review)
    expect(result.card.scheduleStatus).toBe('review')
    expect(result.card.learningStep).toBe(0)
  })

  it('keeps maximum interval as middleware policy', async () => {
    const scheduler = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm: false,
      maximumInterval: 2,
    })
    const state: FSRS7State = {
      stability: 1000,
      stabilityFast: 800,
      difficulty: 5,
    }
    const card = {
      ...scheduler.newCard({ now }),
      ...state,
      state: State.Review,
      lastReviewAt: now,
    }
    const result = scheduler.review({
      card,
      now: new Date(now.getTime() + MS_PER_DAY),
      grade: Rating.Easy,
    })
    expect(scheduler.model.nextInterval(result.card, 0.9)).toBeGreaterThan(2)
    expect(result.card.scheduledDays).toBe(2)
  })

  it('does not use the enableShortTerm policy to disable the intrinsic fast trace', async () => {
    const withSteps = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm: true,
    })
    const withoutSteps = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm: false,
    })
    const config = { weights: [...FSRS7_DEFAULT_WEIGHTS] }
    const model = FSRS7Model.create({ config })
    const input = {
      memoryState: { stability: 1, stabilityFast: 0.8, difficulty: 5 },
      elapsedDays: 0.01,
      rating: Rating.Good,
    } as const
    expect(withSteps.model.step(input)).toEqual(model.step(input))
    expect(withoutSteps.model.step(input)).toEqual(model.step(input))
  })
})
