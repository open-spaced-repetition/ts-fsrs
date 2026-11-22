import {
  defineSchema,
  type Grade,
  type ModelForwardInput,
  type ModelStepInput,
  type RatingScale,
  type RatingScaleGradeOf,
  SRSSchemaError,
} from '@open-spaced-repetition/srs-kit'
import {
  createSchedulerDesiredRetentionMiddleware,
  createSchedulerFuzzingMiddleware,
  dateChrono,
  defaultRatingScale,
  defineMiddleware,
  defineModel,
  defineScheduler,
  numericChrono,
  Rating,
  State,
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerLeechMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'
import { Reschedule } from 'ts-fsrs/reschedule'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createDesiredRetentionConfigSchema,
  type DesiredRetentionConfig,
} from '../middlewares/desired-retention/schema.js'

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

const twoGradeScale = Object.freeze({
  Again: Object.freeze({ value: 0, lapse: true }),
  Good: Object.freeze({ value: 1 }),
} as const) satisfies RatingScale

const threeGradeScale = Object.freeze({
  Again: Object.freeze({ value: 0, lapse: true }),
  Good: Object.freeze({ value: 1 }),
  Easy: Object.freeze({ value: 2 }),
} as const) satisfies RatingScale

const fsrs6BaseConfig = {
  weights: FSRS6_DEFAULT_WEIGHTS,
  enableShortTerm: true,
  numRelearningSteps: 1,
}

type IntervalMapConfig = {
  readonly intervals: Readonly<Record<number, number>>
}

type SimpleState = {
  readonly stability: number
}

const intervalConfigSchema = defineSchema<IntervalMapConfig>((value) => ({
  value: (value as IntervalMapConfig) ?? { intervals: {} },
}))

const simpleStateSchema = defineSchema<SimpleState>((value) => ({
  value: (value as SimpleState) ?? { stability: 1 },
}))

function createIntervalModel<const Scale extends RatingScale>(
  name: string,
  scale: Scale
) {
  return defineModel({
    name,
    ratings: scale,
    schema: {
      config: intervalConfigSchema,
      memoryState: simpleStateSchema,
    },
    defaultValue: {
      memoryState: () => ({ stability: 1 }),
    },
    create({ config }) {
      const step = ({
        rating,
      }: ModelStepInput<SimpleState, number>): SimpleState => ({
        stability: config.intervals[rating] ?? Math.max(1, rating + 1),
      })
      return {
        config,
        bounds: { sMin: 0.01, sMax: 36500 },
        algorithm: null,
        step,
        nextInterval: (state, desiredRetention) =>
          Math.max(0.01, (state.stability * 0.9) / desiredRetention),
        forgettingCurve: () => 0.9,
        forward: ({ history }: ModelForwardInput<SimpleState, number>) => {
          const out: SimpleState[] = []
          let current: SimpleState | null = null
          for (const item of history) {
            current = step({
              memoryState: current,
              rating: item.rating,
              elapsedDays: item.deltaT,
            })
            out.push(current)
          }
          return out
        },
      }
    },
  })
}

const SixGradeModel = createIntervalModel('six-grade-test', sixGradeScale)
const TwoGradeModel = createIntervalModel('two-grade-test', twoGradeScale)
const ThreeGradeModel = createIntervalModel('three-grade-test', threeGradeScale)

const now = new Date('2026-01-01T00:00:00Z')
const sixIntervals = { 0: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
const learningStepsConfig = {
  enableShortTerm: true,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
} as const

const minutesFromNow = (date: Date): number =>
  (date.getTime() - now.getTime()) / 60_000

/** Reduces preview items to the fields the role assertions compare. */
function summarize(
  items: Iterable<{
    readonly grade: number
    readonly card: {
      readonly state: State
      readonly learningStep: number
      readonly dueAt: Date
    }
  }>
) {
  return Array.from(items, ({ grade, card }) => ({
    grade,
    state: card.state,
    learningStep: card.learningStep,
    minutes: minutesFromNow(card.dueAt),
  }))
}

/** Records the candidate retention seen by the last interval query. */
function inspectRetention() {
  const seen: { retention: Record<number, number> } = { retention: {} }
  const middleware = defineMiddleware({
    name: 'inspect-retention',
    handlers: {
      nextInterval(ctx, next) {
        seen.retention = { ...ctx.candidate.desiredRetention }
        next()
      },
    },
  })
  return { middleware, seen }
}

type HistoryRatingOf<T extends { reschedule: (input: never) => unknown }> =
  Parameters<T['reschedule']>[0]['history'][number]['rating']

describe('ts-fsrs rating scales integration', () => {
  describe('two-button FSRS preview', () => {
    it('previews only the requested grades in ascending order and keeps review un-narrowed', () => {
      const scheduler = defineScheduler({
        model: FSRS6Model,
        chrono: dateChrono,
        preview: { grades: [Rating.Good, Rating.Again] },
      })
        .use(
          schedulerDesiredRetentionMiddleware,
          schedulerLearningStepsMiddleware,
          schedulerMaximumIntervalMiddleware,
          schedulerMonotonicIntervalMiddleware
        )
        .create({
          config: {
            ...fsrs6BaseConfig,
            ...learningStepsConfig,
            desiredRetention: 0.9,
            maximumInterval: 36500,
          },
        })

      const card = scheduler.newCard({ now })
      const previews = [...scheduler.preview({ card, now })]
      expect(previews.map((item) => item.grade)).toEqual([
        Rating.Again,
        Rating.Good,
      ])
      expectTypeOf(previews[0].grade).toEqualTypeOf<1 | 3>()
      expect(
        scheduler.review({ card, grade: Rating.Hard, now }).revlog.rating
      ).toBe(Rating.Hard)
    })
  })

  describe('scale-agnostic built-ins', () => {
    it('counts leeches on lapse grades 0, 1, 2 and rolls back cleanly', () => {
      const scheduler = defineScheduler({
        model: SixGradeModel,
        chrono: numericChrono,
      })
        .use(schedulerStatsMiddleware, schedulerLeechMiddleware)
        .create({
          config: {
            intervals: { 0: 1, 1: 1, 2: 1, 3: 3, 4: 5, 5: 8 },
            leechThreshold: 3,
          },
        })

      // Lapses count only on Review cards, so review once first
      let result = scheduler.review({
        card: scheduler.newCard({ now: 0 }),
        grade: 4,
        now: 1,
      })
      expect(result.card).toMatchObject({ lapses: 0, scheduleStatus: 'review' })
      for (const [grade, lapses, scheduleStatus] of [
        [0, 1, 'review'],
        [1, 2, 'review'],
        [2, 3, 'suspended'],
      ] as const) {
        result = scheduler.review({
          card: result.card,
          grade,
          now: 5 * (grade + 1),
        })
        expect(result.card).toMatchObject({ lapses, scheduleStatus })
      }
      expect(
        scheduler.rollback({ card: result.card, revlog: result.revlog })
      ).toMatchObject({ lapses: 2, scheduleStatus: 'review' })
    })

    it('runs fuzzing, maximum-interval, and scheduled-days on six-grade scale', () => {
      const scheduler = defineScheduler({
        model: SixGradeModel,
        chrono: numericChrono,
      })
        .use(
          schedulerScheduledDaysMiddleware,
          schedulerMaximumIntervalMiddleware,
          schedulerFuzzingMiddleware,
          createSchedulerFuzzingMiddleware({ rng: () => () => 0.5 })
        )
        .create({
          config: {
            intervals: { 0: 1, 1: 1, 2: 2, 3: 10, 4: 50, 5: 500 },
            maximumInterval: 100,
            enableFuzz: true,
          },
        })

      const result = scheduler.review({
        card: scheduler.newCard({ now: 0 }),
        grade: 5,
        now: 1,
      })
      expect(result.card.scheduledDays).toBeGreaterThan(0)
      expect(result.card.scheduledDays).toBeLessThanOrEqual(100)
      expect(result.revlog.scheduledDays).toBe(0)
    })
  })

  describe('monotonic-interval on custom scales', () => {
    it('allows ties between lapse grades without shrinking, and bumps non-lapse grades by +1 day', () => {
      const scheduler = defineScheduler({
        model: SixGradeModel,
        chrono: numericChrono,
      })
        .use(
          schedulerScheduledDaysMiddleware,
          schedulerMaximumIntervalMiddleware,
          schedulerMonotonicIntervalMiddleware
        )
        .create({
          config: {
            // Lapse grades: 0 -> 3d, 1 -> 2d (must not shrink -> 3d), 2 -> 3d (tie allowed -> 3d)
            // Non-lapse grades: 3 -> 3d (must bump -> 4d), 4 -> 4d (bump -> 5d), 5 -> 5d (bump -> 6d)
            intervals: { 0: 3, 1: 2, 2: 3, 3: 3, 4: 4, 5: 5 },
            maximumInterval: 100,
          },
        })

      const card = scheduler.newCard({ now: 0 })
      const previews = [...scheduler.preview({ card, now: 0 })]
      expect(previews.map((item) => item.card.scheduledDays)).toEqual([
        3, 3, 3, 4, 5, 6,
      ])
    })

    it('preserves sub-day ties between lapse grades and caps bumped grades at maximumInterval', () => {
      const scheduler = defineScheduler({
        model: SixGradeModel,
        chrono: dateChrono,
      })
        .use(
          schedulerMaximumIntervalMiddleware,
          schedulerMonotonicIntervalMiddleware
        )
        .create({
          config: {
            intervals: { 0: 0.5, 1: 0.2, 2: 0.5, 3: 4, 4: 5, 5: 5 },
            maximumInterval: 5,
            fractionalDays: true,
          },
        })

      const card = scheduler.newCard({ now })
      const days = [...scheduler.preview({ card, now })].map(
        (item) => minutesFromNow(item.card.dueAt) / 1440
      )
      // Lapse grades: 0.5, clamped up to 0.5, tie 0.5; non-lapse capped at 5
      expect(days).toEqual([0.5, 0.5, 0.5, 4, 5, 5])
    })
  })

  describe('learning-steps role derivation', () => {
    const learning = { state: State.Learning }

    it('maps six-grade roles: 0/1/2=again, 3=hard, 4=good, 5=easy', () => {
      const scheduler = defineScheduler({
        model: SixGradeModel,
        chrono: dateChrono,
      })
        .use(schedulerLearningStepsMiddleware)
        .create({
          config: {
            intervals: { 0: 1, 1: 1, 2: 1, 3: 2, 4: 3, 5: 6 },
            ...learningStepsConfig,
          },
        })

      const card = scheduler.newCard({ now })
      expect(summarize(scheduler.preview({ card, now }))).toMatchObject([
        // Again stays at step 0 (1m)
        { grade: 0, ...learning, learningStep: 0, minutes: 1 },
        { grade: 1, ...learning, learningStep: 0, minutes: 1 },
        { grade: 2, ...learning, learningStep: 0, minutes: 1 },
        // Hard repeats step 0 at the midpoint of 1m and 10m
        { grade: 3, ...learning, learningStep: 0, minutes: 5.5 },
        // Good advances to step 1 (10m)
        { grade: 4, ...learning, learningStep: 1, minutes: 10 },
        // Easy graduates immediately
        { grade: 5, state: State.Review, learningStep: 0 },
      ])
    })

    it('maps two-grade roles (n=1 non-lapse): 0=again, 1=good that advances, then graduates', () => {
      const scheduler = defineScheduler({
        model: TwoGradeModel,
        chrono: dateChrono,
      })
        .use(schedulerLearningStepsMiddleware)
        .create({
          config: { intervals: { 0: 1, 1: 4 }, ...learningStepsConfig },
        })

      const card = scheduler.newCard({ now })
      const previews = [...scheduler.preview({ card, now })]
      expect(summarize(previews)).toMatchObject([
        { grade: 0, ...learning, learningStep: 0, minutes: 1 },
        { grade: 1, ...learning, learningStep: 1, minutes: 10 },
      ])

      // A second Good graduates to Review
      const goodCard = previews[1].card
      expect(
        scheduler.review({ card: goodCard, grade: 1, now: goodCard.dueAt }).card
          .state
      ).toBe(State.Review)
    })

    it('maps three-grade roles (n=2 non-lapse): 0=again, 1=good, 2=easy', () => {
      const scheduler = defineScheduler({
        model: ThreeGradeModel,
        chrono: dateChrono,
      })
        .use(schedulerLearningStepsMiddleware)
        .create({
          config: { intervals: { 0: 1, 1: 3, 2: 6 }, ...learningStepsConfig },
        })

      const card = scheduler.newCard({ now })
      expect(summarize(scheduler.preview({ card, now }))).toMatchObject([
        { grade: 0, ...learning, learningStep: 0 },
        { grade: 1, ...learning, learningStep: 1 },
        { grade: 2, state: State.Review },
      ])
    })
  })

  describe('createSchedulerDesiredRetentionMiddleware', () => {
    it.each([false, true])(
      'makes retention optional for a runtime manual flag',
      (manual) => {
        const scale = {
          Maybe: { value: 0, manual },
          Good: { value: 3 },
        } as const
        const scheduler = defineScheduler({
          model: SixGradeModel,
          chrono: numericChrono,
        })
          .use(createSchedulerDesiredRetentionMiddleware(scale))
          .create({ config: { intervals: {}, desiredRetention: 0.8 } })
        const retention = scheduler.config.desiredRetention
        expectTypeOf(retention[0]).toEqualTypeOf<number | undefined>()
        expectTypeOf(retention[3]).toEqualTypeOf<number>()
        expectTypeOf<
          DesiredRetentionConfig<0 | 3>['desiredRetention']
        >().toEqualTypeOf<Record<0 | 3, number>>()
        expect(retention).toEqual(manual ? { 3: 0.8 } : { 0: 0.8, 3: 0.8 })
      }
    )

    it.each([false, true])(
      'preserves only the selected scale’s retention keys',
      (six) => {
        const scale = six ? sixGradeScale : twoGradeScale
        const parsed = createDesiredRetentionConfigSchema(scale).parse({
          desiredRetention: 0.8,
        })
        const scheduler = defineScheduler({
          model: SixGradeModel,
          chrono: numericChrono,
        })
          .use(createSchedulerDesiredRetentionMiddleware(scale))
          .create({ config: { intervals: {}, desiredRetention: 0.8 } })
        expectTypeOf(parsed.desiredRetention).toEqualTypeOf<
          Record<SixGrade, number> | Record<0 | 1, number>
        >()
        expectTypeOf(scheduler.config.desiredRetention).toEqualTypeOf<
          Record<SixGrade, number> | Record<0 | 1, number>
        >()
        // @ts-expect-error The two-grade branch has no grade 5.
        const missingParsed = parsed.desiredRetention[5]
        // @ts-expect-error The two-grade branch has no grade 5.
        const missingConfig = scheduler.config.desiredRetention[5]
        expect(missingParsed).toBe(six ? 0.8 : undefined)
        expect(missingConfig).toBe(six ? 0.8 : undefined)
      }
    )

    const sixRetentionMw =
      createSchedulerDesiredRetentionMiddleware(sixGradeScale)
    const sixRetentionDef = defineScheduler({
      model: SixGradeModel,
      chrono: numericChrono,
    }).use(sixRetentionMw)
    const createSix = (desiredRetention: number | Record<SixGrade, number>) =>
      sixRetentionDef.create({
        config: { intervals: sixIntervals, desiredRetention },
      })
    const perGrade = { 0: 0.95, 1: 0.92, 2: 0.9, 3: 0.88, 4: 0.85, 5: 0.8 }

    it('expands a scalar to every grade, keeps per-grade records, and ignores extra keys', () => {
      expect(createSix(0.85).config.desiredRetention).toEqual({
        0: 0.85,
        1: 0.85,
        2: 0.85,
        3: 0.85,
        4: 0.85,
        5: 0.85,
      })
      expect(createSix(perGrade).config.desiredRetention).toEqual(perGrade)
      const withExtraKey = { ...perGrade, [-1]: 0.9 }
      expect(createSix(withExtraKey).config.desiredRetention).toEqual(perGrade)
    })

    it.each([
      ['a missing grade key', { 0: 0.9, 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.9 }],
      ['a value outside (0, 1)', { ...perGrade, 3: 1 }],
    ])('rejects %s at create', (_, desiredRetention) => {
      expect(() =>
        createSix(desiredRetention as Record<SixGrade, number>)
      ).toThrow(SRSSchemaError)
    })

    it('ignores extra keys such as Manual on the default FSRS scale', () => {
      const scheduler = defineScheduler({
        model: FSRS6Model,
        chrono: dateChrono,
      })
        .use(schedulerDesiredRetentionMiddleware)
        .create({
          config: {
            ...fsrs6BaseConfig,
            desiredRetention: {
              [Rating.Manual]: 0.9,
              [Rating.Again]: 0.85,
              [Rating.Hard]: 0.88,
              [Rating.Good]: 0.9,
              [Rating.Easy]: 0.92,
            } as Record<Grade, number>,
          },
        })
      expect(scheduler.config.desiredRetention).toEqual({
        [Rating.Again]: 0.85,
        [Rating.Hard]: 0.88,
        [Rating.Good]: 0.9,
        [Rating.Easy]: 0.92,
      })
      expect(defaultRatingScale.Good.value).toBe(Rating.Good)
    })

    it('writes only the scheduler grades and leaves the rest at the default retention', () => {
      // A superset middleware on FSRS writes FSRS grades 1..4 only
      const fsrsProbe = inspectRetention()
      const fsrs = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
        .use(sixRetentionMw, fsrsProbe.middleware)
        .create({ config: { ...fsrs6BaseConfig, desiredRetention: perGrade } })
      fsrs.review({ card: fsrs.newCard({ now }), grade: Rating.Good, now })
      expect(Object.keys(fsrsProbe.seen.retention)).toEqual([
        '1',
        '2',
        '3',
        '4',
      ])

      // The default middleware on six grades leaves 0 and 5 at the default 0.9
      const sixProbe = inspectRetention()
      const six = defineScheduler({
        model: SixGradeModel,
        chrono: numericChrono,
      })
        .use(schedulerDesiredRetentionMiddleware, sixProbe.middleware)
        .create({ config: { intervals: sixIntervals, desiredRetention: 0.8 } })
      six.review({ card: six.newCard({ now: 0 }), grade: 3, now: 0 })
      expect(sixProbe.seen.retention).toEqual({
        0: 0.9,
        1: 0.8,
        2: 0.8,
        3: 0.8,
        4: 0.8,
        5: 0.9,
      })
    })

    it('snapshots grade values when the middleware is created', () => {
      const mutableScale = { Pass: { value: 7 } }
      const middleware = createSchedulerDesiredRetentionMiddleware(mutableScale)
      mutableScale.Pass.value = 8
      expect(
        middleware.schema?.config?.parse({ desiredRetention: 0.9 })
      ).toEqual({ desiredRetention: { 7: 0.9 } })
    })
  })

  describe('Reschedule on FSRS, six-grade with manual, and scale without manual', () => {
    it.each([false, true])(
      'accepts only shared history ratings and uses the selected scale to filter manual reviews',
      (six) => {
        const model = six
          ? SixGradeModel
          : createIntervalModel('default', defaultRatingScale)
        const scheduler = defineScheduler({
          model,
          chrono: numericChrono,
        }).create({ config: { intervals: {} } })
        const runner = new Reschedule(scheduler)
        expectTypeOf<HistoryRatingOf<typeof runner>>().toEqualTypeOf<Rating>()
        expectTypeOf<
          Parameters<typeof runner.replay>[0]['history'][number]['rating']
        >().toEqualTypeOf<Rating>()
        const history = [
          { rating: Rating.Manual, reviewTime: 1 },
          { rating: Rating.Good, reviewTime: 2 },
        ]
        expect(
          runner.reschedule({ history }).results.map((r) => r.revlog.rating)
        ).toEqual(six ? [0, 3] : [3])
        expect(runner.replay({ history }).memoryStates).toHaveLength(
          six ? 2 : 1
        )
      }
    )

    it('skips manual ratings on FSRS and rejects invalid ratings with SRSSchemaError', () => {
      const rescheduler = new Reschedule(
        defineScheduler({ model: FSRS6Model, chrono: dateChrono }).create({
          config: fsrs6BaseConfig,
        })
      )
      expectTypeOf<
        HistoryRatingOf<typeof rescheduler>
      >().toEqualTypeOf<Rating>()

      const day = (offset: number) =>
        new Date(now.getTime() + offset * 86_400_000)
      const result = rescheduler.reschedule({
        history: [
          { rating: Rating.Manual, reviewTime: day(0) },
          { rating: Rating.Good, reviewTime: day(1) },
          { rating: Rating.Easy, reviewTime: day(3) },
        ],
      })
      expect(result.results.map((r) => r.revlog.rating)).toEqual([
        Rating.Good,
        Rating.Easy,
      ])
      const replayed = rescheduler.replay({
        history: [
          { rating: Rating.Manual, reviewTime: day(0) },
          { rating: Rating.Good, reviewTime: day(1) },
        ],
      })
      expect(replayed.memoryStates).toHaveLength(1)
      expect(() =>
        rescheduler.reschedule({
          history: [{ rating: 99 as Rating, reviewTime: day(0) }],
        })
      ).toThrow(SRSSchemaError)
    })

    it('skips manual -1 on six-grade scale in replay and reschedule and rejects invalid ratings', () => {
      const rescheduler = new Reschedule(
        defineScheduler({ model: SixGradeModel, chrono: numericChrono }).create(
          {
            config: { intervals: { 0: 1, 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 } },
          }
        )
      )
      expectTypeOf<HistoryRatingOf<typeof rescheduler>>().toEqualTypeOf<
        -1 | 0 | 1 | 2 | 3 | 4 | 5
      >()

      const rescheduled = rescheduler.reschedule({
        history: [
          { rating: -1, reviewTime: 1 },
          { rating: 0, reviewTime: 2 },
          { rating: -1, reviewTime: 3 },
          { rating: 5, reviewTime: 4 },
        ],
      })
      expect(rescheduled.results.map((r) => r.revlog.rating)).toEqual([0, 5])
      const replayed = rescheduler.replay({
        history: [
          { rating: -1, reviewTime: 1 },
          { rating: 3, reviewTime: 2 },
          { rating: 4, reviewTime: 5 },
        ],
      })
      expect(replayed.memoryStates).toHaveLength(2)
      expect(() =>
        rescheduler.replay({ history: [{ rating: 6 as -1, reviewTime: 1 }] })
      ).toThrow(SRSSchemaError)
    })

    it('replays a scale with zero manual entries and rejects out-of-scale ratings', () => {
      const rescheduler = new Reschedule(
        defineScheduler({ model: TwoGradeModel, chrono: numericChrono }).create(
          {
            config: { intervals: { 0: 1, 1: 4 } },
          }
        )
      )
      expectTypeOf<HistoryRatingOf<typeof rescheduler>>().toEqualTypeOf<0 | 1>()

      const rescheduled = rescheduler.reschedule({
        history: [
          { rating: 0, reviewTime: 1 },
          { rating: 1, reviewTime: 2 },
        ],
      })
      expect(rescheduled.results.map((r) => r.revlog.rating)).toEqual([0, 1])
      expect(() =>
        rescheduler.reschedule({
          history: [{ rating: -1 as 0, reviewTime: 1 }],
        })
      ).toThrow(SRSSchemaError)
    })
  })
})
