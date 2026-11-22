import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import {
  defineMiddleware,
  schedulerStatsMiddleware,
} from '@/middleware/index.js'
import {
  type AnyModel,
  type BlankModelEnv,
  defineModel,
  type Model,
  type ModelCreate,
  type ModelGradeOf,
  type ModelRatingOf,
} from '@/model/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import {
  SM2_SIX_GRADE_DEFAULT_WEIGHTS,
  type SM2SixGrade,
  SM2SixGradeModel,
  sm2SixGradeScale,
} from '@/model/sm2-six-grade.test.js'
import {
  type Grade,
  gradeSchema,
  grades,
  Rating,
  ratingSchema,
  ratings,
} from '@/primitives/rating.js'
import {
  defaultRatingScale,
  type RatingScale,
  type RatingScaleEntry,
  type RatingScaleGradeOf,
  type RatingScaleRatingOf,
} from '@/primitives/rating-scale.js'
import { defineSchema, SRSSchemaError } from '@/schema/index.js'
import { defineScheduler } from './define-scheduler.js'
import { defaultSchedulerRatings } from './ratings.js'

const twoGradeScale = Object.freeze({
  Again: Object.freeze({ value: 0, lapse: true }),
  Good: Object.freeze({ value: 1 }),
} as const) satisfies RatingScale

type DummyState = { readonly s: number }

const dummyStateSchema = defineSchema<DummyState>((v) => ({
  value: (v as DummyState) ?? { s: 1 },
}))

function createDummyCore(onStep?: (rating: number) => void) {
  const step = ({
    rating,
  }: {
    readonly memoryState: Readonly<DummyState> | null
    readonly rating: number
    readonly elapsedDays: number
  }) => {
    onStep?.(rating)
    return { s: rating + 1 }
  }
  return {
    config: {},
    bounds: { sMin: 0.01, sMax: 36500 },
    algorithm: null,
    step,
    nextInterval: (state: Readonly<DummyState>) => Math.max(1, state.s),
    forgettingCurve: () => 0.9,
    forward: ({
      history,
    }: {
      readonly history: readonly {
        readonly rating: number
        readonly deltaT: number
      }[]
    }) =>
      history.map((item) =>
        step({
          memoryState: null,
          rating: item.rating,
          elapsedDays: item.deltaT,
        })
      ),
  }
}

/** Everything a dummy model needs except `name` and `ratings`. */
const dummyModelBody = {
  schema: {
    config: defineSchema<Record<string, never>>(() => ({ value: {} })),
    memoryState: dummyStateSchema,
  },
  defaultValue: { memoryState: () => ({ s: 1 }) },
  create: () => createDummyCore(),
}

function createDummyModel<const Scale extends RatingScale>(
  name: string,
  scale: Scale,
  onStep?: (rating: number) => void
) {
  return defineModel({
    name,
    ratings: scale,
    ...dummyModelBody,
    create: () => createDummyCore(onStep),
  })
}

function createScaleScheduler<const Scale extends RatingScale>(scale: Scale) {
  const definition = defineScheduler({
    model: createDummyModel('scale', scale),
    chrono: numericChrono,
  })
  // The dummy config is empty, but a generic Scale defers its type.
  return definition.create({ config: {} as never })
}

const sixGradeConfig = { weights: SM2_SIX_GRADE_DEFAULT_WEIGHTS }

describe('rating scales', () => {
  describe('defaultRatingScale and RatingScaleEntry primitives', () => {
    it('infers values across scales with different entry names', () => {
      type Scale =
        | { Low: { value: 1 }; Manual: { value: 0; manual: true } }
        | { High: { value: 7 } }
      expectTypeOf<RatingScaleGradeOf<Scale>>().toEqualTypeOf<1 | 7>()
      expectTypeOf<RatingScaleRatingOf<Scale>>().toEqualTypeOf<0 | 1 | 7>()
    })

    it('exports frozen defaultRatingScale and preserves legacy primitives', () => {
      expect(Object.isFrozen(defaultRatingScale)).toBe(true)
      for (const entry of Object.values(defaultRatingScale)) {
        expect(Object.isFrozen(entry)).toBe(true)
      }
      expect(defaultRatingScale).toEqual({
        Manual: { value: 0, manual: true },
        Again: { value: 1, lapse: true },
        Hard: { value: 2 },
        Good: { value: 3 },
        Easy: { value: 4 },
      })
      expect(Rating.Again).toBe(1)
      expect(ratings).toEqual([0, 1, 2, 3, 4])
      expect(grades).toEqual([1, 2, 3, 4])
      expect(gradeSchema.parse(Rating.Good)).toBe(Rating.Good)
      expect(ratingSchema.parse(Rating.Manual)).toBe(Rating.Manual)
      expectTypeOf<
        RatingScaleGradeOf<typeof defaultRatingScale>
      >().toEqualTypeOf<Grade>()
      expectTypeOf(defaultSchedulerRatings.manual).toEqualTypeOf<readonly 0[]>()
    })

    it('accepts a scale held in a plain variable without `as const`', () => {
      const plainScale = {
        Manual: { value: 0, manual: true },
        Again: { value: 1, lapse: true },
        Good: { value: 3 },
      }
      const { ratings } = createScaleScheduler(plainScale)
      expect(ratings.grades).toEqual([1, 3])
      expect(ratings.manual).toEqual([0])
    })

    it('keeps widened scale inputs callable with numeric grades', () => {
      const scale: RatingScale = { Pass: { value: 7 } }
      const model = createDummyModel('wide', scale)
      const core = model.create({ config: {} })
      expect(
        core.step({ memoryState: null, rating: 7, elapsedDays: 0 })
      ).toEqual({ s: 8 })
      const scheduler = defineScheduler({
        model,
        chrono: numericChrono,
        preview: { grades: [7] },
      }).create({ config: {} })
      expect(
        scheduler.review({
          card: scheduler.newCard({ now: 0 }),
          grade: 7,
          now: 1,
        }).revlog.rating
      ).toBe(7)
    })
  })

  describe('scale validation at defineScheduler', () => {
    it('snapshots the same value it validated', () => {
      const read = vi.fn().mockReturnValueOnce(1).mockReturnValue(Number.NaN)
      const { ratings } = createScaleScheduler({
        Pass: {
          get value(): number {
            return read()
          },
        },
      })
      expect(read).toHaveBeenCalledTimes(1)
      expect(ratings.scale.Pass.value).toBe(1)
    })

    it.each(['manual', 'lapse'])('rejects a non-boolean %s flag', (flag) => {
      const scale = { Bad: { value: 0, [flag]: 'false' }, Good: { value: 1 } }
      expect(() => createScaleScheduler(scale)).toThrow(
        `Invalid rating scale entry "Bad": ${flag} must be boolean`
      )
    })

    it.each([
      [
        'a NaN value',
        { Broken: { value: Number.NaN }, Good: { value: 1 } },
        /Broken/,
      ],
      [
        'an infinite value',
        { Broken: { value: Infinity }, Good: { value: 1 } },
        /Broken/,
      ],
      [
        'a -Infinity value',
        { Broken: { value: -Infinity }, Good: { value: 1 } },
        /Broken/,
      ],
      [
        'a null entry',
        { NullEntry: null as unknown as RatingScaleEntry, Good: { value: 1 } },
        /NullEntry/,
      ],
      [
        'duplicate grades',
        { First: { value: 1 }, Second: { value: 1 } },
        /Second/,
      ],
      [
        'a manual value reused by a grade',
        { Manual: { value: 2, manual: true }, Good: { value: 2 } },
        /Good/,
      ],
      [
        'an entry both manual and lapse',
        { Both: { value: 0, manual: true, lapse: true }, Good: { value: 1 } },
        /Both/,
      ],
      ['only lapse grades', { Again: { value: 1, lapse: true } }, /non-lapse/],
      ['no entries', {}, /non-lapse/],
      [
        'a lapse above a non-lapse grade',
        {
          PassHigh: { value: 5 },
          PassLow: { value: 2 },
          BadLapse: { value: 3, lapse: true },
        },
        /BadLapse/,
      ],
    ] satisfies [string, RatingScale, RegExp][])(
      'rejects %s, naming the offending entry',
      (_, scale, error) => {
        expect(() =>
          defineScheduler({
            model: createDummyModel('invalid', scale),
            chrono: numericChrono,
          })
        ).toThrow(error)
      }
    )

    it('sorts grades and manual values ascending regardless of key order', () => {
      const { ratings } = createScaleScheduler({
        PassHigh: { value: 10 },
        ManualHigh: { value: 100, manual: true },
        LapseHigh: { value: 2, lapse: true },
        PassLow: { value: 5 },
        ManualLow: { value: -5, manual: true },
        LapseLow: { value: 0, lapse: true },
      })
      expect(ratings.grades).toEqual([0, 2, 5, 10])
      expect(ratings.preview).toEqual([0, 2, 5, 10])
      expect(ratings.manual).toEqual([-5, 100])
      expect([0, 2, 5].map(ratings.isLapse)).toEqual([true, true, false])
      expect([-5, 100, 0].map(ratings.isManual)).toEqual([true, true, false])
    })

    it('supports a scale with zero manual entries', () => {
      const { ratings } = createScaleScheduler(twoGradeScale)
      expect(ratings.grades).toEqual([0, 1])
      expect(ratings.manual).toEqual([])
      expect(ratings.isManual(0)).toBe(false)
      expect([0, 1].map(ratings.isLapse)).toEqual([true, false])
    })
  })

  describe('model rating/grade inference and forward without validation', () => {
    it('infers ModelRatingOf and ModelGradeOf for default and custom models', () => {
      expectTypeOf<ModelRatingOf<typeof SM2Model>>().toEqualTypeOf<Rating>()
      expectTypeOf<ModelGradeOf<typeof SM2Model>>().toEqualTypeOf<Grade>()
      expectTypeOf<ModelRatingOf<typeof SM2SixGradeModel>>().toEqualTypeOf<
        -1 | 0 | 1 | 2 | 3 | 4 | 5
      >()
      expectTypeOf<ModelGradeOf<typeof SM2SixGradeModel>>().toEqualTypeOf<
        0 | 1 | 2 | 3 | 4 | 5
      >()
    })

    it('carries custom rating values in the model env and keeps Model extensible', () => {
      const customModel = createDummyModel('pass-only', {
        Pass: { value: 7 },
      })
      // A custom-scale model carries its rating values in the env
      expectTypeOf<ModelGradeOf<typeof customModel>>().toEqualTypeOf<7>()
      expectTypeOf<ModelRatingOf<typeof customModel>>().toEqualTypeOf<7>()
      expectTypeOf(customModel.ratings).toEqualTypeOf<RatingScale | undefined>()
      expect(customModel.ratings?.Pass?.value).toBe(7)

      // Default model ratings is optional undefined, and interface Model<Env> is extensible
      expectTypeOf(SM2Model.ratings).toEqualTypeOf<undefined>()
      expect(SM2Model.ratings).toBeUndefined()
      interface NamedModel<E extends BlankModelEnv> extends Model<E> {
        readonly label: string
      }
      const named: NamedModel<{
        readonly name: 'sm2'
        readonly config: (typeof SM2Model)['schema']['config']
        readonly memoryState: (typeof SM2Model)['schema']['memoryState']
        readonly algorithm: null
      }> = { ...SM2Model, label: 'named-sm2' }
      expect(named.label).toBe('named-sm2')
    })

    it.each([false, true])(
      'requires conditional scales to select a model branch',
      (withScale) => {
        const customScale = { Pass: { value: 7 } } as const
        const rejectOptionalRatings = () => {
          // @ts-expect-error optional scales cannot determine accepted grades
          defineModel({
            name: 'conditional-scale',
            ...dummyModelBody,
            ...(withScale ? { ratings: customScale } : {}),
          })
          defineModel({
            name: 'ternary-scale',
            // @ts-expect-error optional scales cannot determine accepted grades
            ratings: withScale ? customScale : undefined,
            ...dummyModelBody,
          })
        }
        expect(typeof rejectOptionalRatings).toBe('function')
        const customModel = defineModel({
          name: 'custom',
          ratings: customScale,
          ...dummyModelBody,
        })
        const explicitModel = defineModel<
          'explicit',
          typeof dummyModelBody.schema.config,
          typeof dummyModelBody.schema.memoryState,
          null,
          readonly DummyState[],
          typeof customScale
        >({ name: 'explicit', ratings: customScale, ...dummyModelBody })
        expectTypeOf<ModelGradeOf<typeof explicitModel>>().toEqualTypeOf<7>()
        const defaultModel = defineModel({ name: 'default', ...dummyModelBody })
        expectTypeOf<ModelGradeOf<typeof customModel>>().toEqualTypeOf<7>()
        expectTypeOf<ModelGradeOf<typeof defaultModel>>().toEqualTypeOf<Grade>()
        const scheduler = withScale
          ? defineScheduler({
              model: customModel,
              chrono: numericChrono,
            }).create({ config: {} })
          : defineScheduler({
              model: defaultModel,
              chrono: numericChrono,
            }).create({ config: {} })
        expect(scheduler.ratings.grades).toEqual(withScale ? [7] : [1, 2, 3, 4])
      }
    )

    it.each([false, true])(
      'preserves the selected model’s grades and manual ratings',
      (six) => {
        const model = six ? SM2SixGradeModel : SM2Model
        const scheduler = defineScheduler({
          model,
          chrono: numericChrono,
          preview: { grades: [3] },
        }).create({
          config: {
            weights: six ? SM2_SIX_GRADE_DEFAULT_WEIGHTS : SM2_DEFAULT_WEIGHTS,
          },
        })
        expectTypeOf<(typeof scheduler.ratings.grades)[number]>().toEqualTypeOf<
          Grade | SM2SixGrade
        >()
        expectTypeOf<(typeof scheduler.ratings.manual)[number]>().toEqualTypeOf<
          0 | -1
        >()
        expect(scheduler.ratings.grades).toEqual(
          six ? [0, 1, 2, 3, 4, 5] : grades
        )
        expect(scheduler.ratings.manual).toEqual(six ? [-1] : [0])
        expectTypeOf(scheduler.ratings.preview).toEqualTypeOf<readonly 3[]>()
        expect(scheduler.ratings.preview).toEqual([3])
        const previewFive = () =>
          defineScheduler({
            model,
            chrono: numericChrono,
            // @ts-expect-error Only the six-grade model supports grade 5.
            preview: { grades: [5] },
          })
        if (model.name === SM2SixGradeModel.name) {
          expect(() =>
            defineScheduler({
              model,
              chrono: numericChrono,
              preview: { grades: [5] },
            })
          ).not.toThrow()
        } else {
          expect(previewFive).toThrow(/not a grade/)
        }
      }
    )

    it.each([false, true])(
      'requires preview grades shared by every possible scale',
      (high) => {
        const lowScale = {
          Manual: { value: 0, manual: true },
          Good: { value: 3 },
        } as const
        const highScale = {
          Again: { value: 0, lapse: true },
          High: { value: 5 },
          Good: { value: 3 },
        } as const
        const model = createDummyModel(
          'conditional',
          high ? highScale : lowScale
        )
        const core = model.create({ config: {} })
        expect(
          core.step({ memoryState: null, rating: 3, elapsedDays: 0 })
        ).toEqual({ s: 4 })
        expect(
          core.forward({ history: [{ rating: 3, deltaT: 0 }] })
        ).toHaveLength(1)
        const unsupportedCoreRatings = () => {
          // @ts-expect-error Zero is manual on the low scale.
          core.step({ memoryState: null, rating: 0, elapsedDays: 0 })
          // @ts-expect-error Zero is manual on the low scale.
          core.forward({ history: [{ rating: 0, deltaT: 0 }] })
        }
        expect(typeof unsupportedCoreRatings).toBe('function')
        const definition = defineScheduler({
          model,
          chrono: numericChrono,
          preview: { grades: [3] },
        })
        const scheduler = definition.create({ config: {} })
        const extended = definition
          .use(schedulerStatsMiddleware)
          .create({ config: {} })
        expectTypeOf<
          (typeof scheduler.ratings.manual)[number]
        >().toEqualTypeOf<0>()
        expectTypeOf<
          (typeof extended.ratings.manual)[number]
        >().toEqualTypeOf<0>()
        expect(scheduler.ratings.manual).toEqual(high ? [] : [0])
        const reviewZero = () =>
          scheduler.review({
            card: scheduler.newCard({ now: 0 }),
            now: 0,
            // @ts-expect-error Zero is manual on the low scale.
            grade: 0,
          })
        if (high) expect(reviewZero).not.toThrow()
        else expect(reviewZero).toThrow(/grade/)
        expect(
          extended.review({
            card: extended.newCard({ now: 0 }),
            now: 0,
            grade: 3,
          }).revlog.rating
        ).toBe(3)
        expect(scheduler.ratings.preview).toEqual([3])
        const previewHigh = () =>
          defineScheduler({
            model,
            chrono: numericChrono,
            // @ts-expect-error Only the high scale supports grade 5.
            preview: { grades: [5] },
          })
        if (high) expect(previewHigh).not.toThrow()
        else expect(previewHigh).toThrow(/not a grade/)
      }
    )

    it.each([false, true])(
      'keeps runtime manual flags safe at model and scheduler inputs',
      (manual) => {
        const scale = {
          Maybe: { value: 0, manual },
          Good: { value: 3 },
        } as const
        const model = createDummyModel('runtime-manual', scale)
        const core = model.create({ config: {} })
        const invalidCore = () => {
          // @ts-expect-error Zero may be a manual rating.
          core.step({ memoryState: null, rating: 0, elapsedDays: 0 })
          // @ts-expect-error Zero may be a manual rating.
          core.forward({ history: [{ rating: 0, deltaT: 0 }] })
        }
        expect(typeof invalidCore).toBe('function')
        const definition = defineScheduler({ model, chrono: numericChrono })
        const scheduler = definition
          .use(schedulerStatsMiddleware)
          .create({ config: {} })
        const invalidPreview = () =>
          defineScheduler({
            model,
            chrono: numericChrono,
            // @ts-expect-error Zero may be a manual rating.
            preview: { grades: [0] },
          })
        const reviewZero = () =>
          scheduler.review({
            card: scheduler.newCard({ now: 0 }),
            now: 1,
            // @ts-expect-error Zero may be a manual rating.
            grade: 0,
          })
        expectTypeOf<
          (typeof scheduler.ratings.manual)[number]
        >().toEqualTypeOf<0>()
        expectTypeOf<(typeof scheduler.ratings.grades)[number]>().toEqualTypeOf<
          0 | 3
        >()
        expect(scheduler.ratings.manual).toEqual(manual ? [0] : [])
        expect(scheduler.ratings.grades).toEqual(manual ? [3] : [0, 3])
        expect(
          core.step({ memoryState: null, rating: 3, elapsedDays: 0 })
        ).toEqual({ s: 4 })
        if (manual) {
          expect(invalidPreview).toThrow(/manual/)
          expect(reviewZero).toThrow(/grade/)
        } else {
          expect(invalidPreview).not.toThrow()
          expect(reviewZero).not.toThrow()
        }
      }
    )

    it('keeps explicit generics, default-scale reuse, and ModelCreate<any, Algorithm> typing', () => {
      // Explicit two-generic defineScheduler<M, C> remains valid
      const explicitSched = defineScheduler<
        typeof SM2Model,
        typeof numericChrono
      >({
        model: SM2Model,
        chrono: numericChrono,
      }).create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
      expect(explicitSched.ratings.grades).toEqual([1, 2, 3, 4])
      expectTypeOf(explicitSched.ratings.preview).toEqualTypeOf<
        readonly Grade[]
      >()

      // An explicit defaultRatingScale reuses the shared default ratings
      expect(createScaleScheduler(defaultRatingScale).ratings).toBe(
        defaultSchedulerRatings
      )

      // ModelCreate<any, Algorithm> preserves the concrete Algorithm type
      // biome-ignore lint/suspicious/noExplicitAny: explicitly testing ModelCreate<any, Algorithm>
      type ErasedSchemaCreate = ModelCreate<any, { readonly x: number }>
      const checkAlgorithm = (create: ErasedSchemaCreate) => {
        const core = create({ config: {} })
        expectTypeOf(core.algorithm.x).toEqualTypeOf<number>()
        // @ts-expect-error concrete Algorithm type must reject nonexistent methods
        core.algorithm.nonexistent()
      }
      expect(typeof checkAlgorithm).toBe('function')
    })

    it('does not validate ratings in model.forward', () => {
      const model = SM2SixGradeModel.create({ config: sixGradeConfig })
      const states = model.forward({
        history: [{ rating: 99 as SM2SixGrade, deltaT: 0 }],
      })
      expect(states).toHaveLength(1)
    })
  })

  describe('preview subset and define-time validation', () => {
    const defineWithPreview = (model: AnyModel, preview: unknown) => () =>
      defineScheduler({
        model,
        chrono: numericChrono,
        preview: preview as { readonly grades: readonly number[] },
      })

    it.each([
      ['an empty list', SM2Model, { grades: [] }, /non-empty/],
      ['a null option', SM2Model, null, /non-empty array/],
      ['a manual rating', SM2Model, { grades: [Rating.Manual] }, /manual/],
      ['an unknown grade', SM2Model, { grades: [99] }, /not a grade/],
      [
        'a six-grade manual rating',
        SM2SixGradeModel,
        { grades: [-1] },
        /manual/,
      ],
      [
        'an unknown six-grade grade',
        SM2SixGradeModel,
        { grades: [99] },
        /not a grade/,
      ],
    ] satisfies [string, AnyModel, unknown, RegExp][])(
      'rejects preview with %s at defineScheduler time',
      (_, model, preview, error) => {
        expect(defineWithPreview(model, preview)).toThrow(error)
      }
    )

    it('rejects undefined preview grades at compile time and runtime', () => {
      expect(() =>
        defineScheduler({
          model: SM2Model,
          chrono: numericChrono,
          // @ts-expect-error preview.grades must not accept undefined
          preview: { grades: undefined },
        })
      ).toThrow(/non-empty array/)
    })

    it('reads the preview list and its elements once when taking the snapshot', () => {
      const input = [Rating.Good]
      const readGrade = vi
        .fn()
        .mockReturnValueOnce(Rating.Good)
        .mockReturnValue(Rating.Manual)
      Object.defineProperty(input, 0, { get: readGrade })
      const readList = vi
        .fn()
        .mockReturnValueOnce(input)
        .mockReturnValue([Rating.Manual])
      const scheduler = defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
        preview: {
          get grades(): readonly Grade[] {
            return readList()
          },
        },
      }).create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
      expect(scheduler.ratings.preview).toEqual([Rating.Good])
      expect(readList).toHaveBeenCalledTimes(1)
      expect(readGrade).toHaveBeenCalledTimes(1)
    })

    it('does not narrow preview grades when preview is conditionally provided', () => {
      const model = createDummyModel('two-pass', {
        Low: { value: 3 },
        High: { value: 7 },
      })
      const includePreview = Math.random() > 2
      const spreadSched = defineScheduler({
        model,
        chrono: numericChrono,
        ...(includePreview ? { preview: { grades: [3] as const } } : {}),
      }).create({ config: {} })
      const ternarySched = defineScheduler({
        model,
        chrono: numericChrono,
        preview: includePreview ? { grades: [3] as const } : undefined,
      }).create({ config: {} })

      for (const { ratings } of [spreadSched, ternarySched]) {
        expect(ratings.preview).toEqual([3, 7])
        expectTypeOf(ratings.preview).toEqualTypeOf<readonly (3 | 7)[]>()
      }
      // @ts-expect-error conditional preview must not narrow preview grades to readonly 3[]
      const tooNarrow: readonly 3[] = spreadSched.ratings.preview
      expect(tooNarrow).toEqual([3, 7])
    })

    it('previews a sorted, deduplicated default-scale subset without narrowing review', () => {
      const scheduler = defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
        preview: { grades: [Rating.Good, Rating.Again, Rating.Good] },
      }).create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
      expect(scheduler.ratings.preview).toEqual([Rating.Again, Rating.Good])
      expect(scheduler.ratings.grades).toEqual([1, 2, 3, 4])

      const card = scheduler.newCard({ now: 0 })
      const previewItems = [...scheduler.preview({ card, now: 1 })]
      expect(previewItems.map((item) => item.grade)).toEqual([
        Rating.Again,
        Rating.Good,
      ])
      expectTypeOf(previewItems[0].grade).toEqualTypeOf<1 | 3>()

      const hardReview = scheduler.review({ card, grade: Rating.Hard, now: 1 })
      expect(hardReview.revlog.rating).toBe(Rating.Hard)
    })

    it('supports a preview subset on the six-grade scale', () => {
      const scheduler = defineScheduler({
        model: SM2SixGradeModel,
        chrono: numericChrono,
        preview: { grades: [5, 0, 3] },
      }).create({ config: sixGradeConfig })
      const card = scheduler.newCard({ now: 0 })
      const previewItems = [...scheduler.preview({ card, now: 1 })]
      expect(previewItems.map((item) => item.grade)).toEqual([0, 3, 5])
      expectTypeOf(previewItems[0].grade).toEqualTypeOf<0 | 3 | 5>()
    })
  })

  describe('ratings identity, freezing, and schema reuse', () => {
    it('reuses identical frozen ratings across create() and use() branches', () => {
      const base = defineScheduler({
        model: SM2SixGradeModel,
        chrono: numericChrono,
      })
      const branchA = base.use(schedulerStatsMiddleware)
      const branchB = branchA.use(defineMiddleware({ name: 'noop' }))
      const [first, ...rest] = [
        base.create({ config: sixGradeConfig }),
        base.create({ config: sixGradeConfig }),
        branchA.create({ config: sixGradeConfig }),
        branchB.create({ config: sixGradeConfig }),
      ].map((core) => core.ratings)

      for (const value of [first, first.grades, first.preview, first.manual]) {
        expect(Object.isFrozen(value)).toBe(true)
      }
      for (const other of rest) {
        expect(other).toBe(first)
      }
    })

    it('reuses default schemas by identity and derives them for structural copies', () => {
      const defaultRatings = defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
      }).create({ config: { weights: SM2_DEFAULT_WEIGHTS } }).ratings
      const twoButtonRatings = defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
        preview: { grades: [Rating.Again, Rating.Good] },
      }).create({ config: { weights: SM2_DEFAULT_WEIGHTS } }).ratings
      for (const { gradeSchema: grade, ratingSchema: rating } of [
        defaultRatings,
        twoButtonRatings,
      ]) {
        expect(grade).toBe(gradeSchema)
        expect(rating).toBe(ratingSchema)
      }
      expect([Rating.Again, Rating.Good].map(defaultRatings.isLapse)).toEqual([
        true,
        false,
      ])
      expect(
        [Rating.Manual, Rating.Again].map(defaultRatings.isManual)
      ).toEqual([true, false])

      const copy = createScaleScheduler({
        Manual: { value: 0, manual: true },
        Again: { value: 1, lapse: true },
        Hard: { value: 2 },
        Good: { value: 3 },
        Easy: { value: 4 },
      }).ratings
      expect(copy.gradeSchema).not.toBe(gradeSchema)
      expect(copy.ratingSchema).not.toBe(ratingSchema)
      expect(copy.gradeSchema.parse(Rating.Good)).toBe(Rating.Good)
      expect(copy.ratingSchema.parse(Rating.Manual)).toBe(Rating.Manual)
      expect(() => copy.gradeSchema.parse(Rating.Manual)).toThrow(
        SRSSchemaError
      )
      expect(() => copy.ratingSchema.parse(99)).toThrow(SRSSchemaError)
    })
  })

  describe('six-grade lifecycle, forward upfront validation, and desiredRetention pre-fill', () => {
    it('handles review, preview, forward, nextInterval, revlog parse, rollback, and rejects manual/invalid grades', () => {
      let retentionKeys: string[] = []
      const definition = defineScheduler({
        model: SM2SixGradeModel,
        chrono: numericChrono,
      }).use(
        defineMiddleware({
          name: 'inspect-retention',
          handlers: {
            nextInterval(ctx, next) {
              retentionKeys = Object.keys(ctx.candidate.desiredRetention)
              next()
            },
          },
        }),
        schedulerStatsMiddleware
      )
      const scheduler = definition.create({ config: sixGradeConfig })

      const card = scheduler.newCard({ now: 0 })
      const previewItems = [...scheduler.preview({ card, now: 1 })]
      expect(previewItems.map((item) => item.grade)).toEqual([0, 1, 2, 3, 4, 5])
      expect(retentionKeys).toEqual(['0', '1', '2', '3', '4', '5'])

      const reviewed = scheduler.review({ card, grade: 4, now: 1 })
      expect(reviewed.revlog.rating).toBe(4)
      for (const retention of [0.9, 0.85]) {
        expect(
          scheduler.nextInterval(reviewed.card, retention, {
            card: reviewed.card,
            grade: 3,
            elapsedDays: 1,
          })
        ).toBeGreaterThan(0)
      }

      // The revlog schema parses valid grades and rejects manual / invalid ones
      expect(definition.schema.revlog.parse(reviewed.revlog).rating).toBe(4)
      for (const rating of [-1, 6]) {
        expect(() =>
          definition.schema.revlog.parse({ ...reviewed.revlog, rating })
        ).toThrow(SRSSchemaError)
        expect(() =>
          scheduler.review({ card, grade: rating as SM2SixGrade, now: 1 })
        ).toThrow(SRSSchemaError)
      }
      expect(() =>
        scheduler.nextInterval(card, 0.9, {
          card,
          grade: -1 as SM2SixGrade,
          elapsedDays: 1,
        })
      ).toThrow(SRSSchemaError)

      expect(
        scheduler.rollback({ card: reviewed.card, revlog: reviewed.revlog })
          .reps
      ).toBe(0)

      const forwardResults = scheduler.forward({
        history: [
          { rating: 3, reviewTime: 1 },
          { rating: 0, reviewTime: 2 },
          { rating: 5, reviewTime: 3 },
        ],
      })
      expect(forwardResults).toHaveLength(3)
      expect(forwardResults[2].card.lapses).toBe(1)
    })

    it.each([
      ['a manual rating', -1],
      ['an out-of-scale rating', 99],
    ])(
      'validates every forward rating before stepping when history contains %s',
      (_, badRating) => {
        const stepSpy = vi.fn()
        const scheduler = defineScheduler({
          model: createDummyModel('spy-six', sm2SixGradeScale, stepSpy),
          chrono: numericChrono,
        }).create({ config: {} })
        expect(() =>
          scheduler.forward({
            history: [
              { rating: 3, reviewTime: 1 },
              { rating: badRating as SM2SixGrade, reviewTime: 2 },
              { rating: 4, reviewTime: 3 },
            ],
          })
        ).toThrow(SRSSchemaError)
        expect(stepSpy).not.toHaveBeenCalled()
      }
    )

    it('replays the rating read during upfront validation', () => {
      const scheduler = createScaleScheduler(sm2SixGradeScale)
      let reads = 0
      const result = scheduler.forward({
        history: [
          {
            get rating(): SM2SixGrade {
              return ++reads === 1 ? 3 : 4
            },
            reviewTime: 1,
          },
        ],
      })
      expect(result[0].revlog.rating).toBe(3)
      expect(reads).toBe(1)
    })
  })

  describe('middleware context types, scale snapshots, and stats lapses', () => {
    it('types middleware contexts with the default Grade', () => {
      const defaultMw = defineMiddleware({
        name: 'default-mw',
        handlers: {
          review(ctx, next) {
            expectTypeOf(ctx.input.grade).toEqualTypeOf<Grade>()
            next()
          },
          rollback(ctx, next) {
            expectTypeOf(ctx.input.revlog.rating).toEqualTypeOf<Grade>()
            next()
          },
        },
      })
      expect(defaultMw.name).toBe('default-mw')
    })

    it('snapshots and freezes custom scales against post-define mutation', () => {
      const mutableScale = { Pass: { value: 7 } }
      const { ratings } = createScaleScheduler(mutableScale)
      mutableScale.Pass.value = 9
      expect(Object.isFrozen(ratings.scale)).toBe(true)
      expect(Object.isFrozen(ratings.scale.Pass)).toBe(true)
      expect(ratings.scale.Pass.value).toBe(7)
      expect(ratings.grades).toEqual([7])

      // An own key named '__proto__' survives the snapshot, and the snapshot can be reused
      const protoRatings = createScaleScheduler({
        Low: { value: 7 },
        ['__proto__']: { value: 8 },
      } as RatingScale).ratings
      expect(Object.keys(protoRatings.scale)).toEqual(['Low', '__proto__'])
      expect(protoRatings.grades).toEqual([7, 8])
      expect(createScaleScheduler(protoRatings.scale).ratings.grades).toEqual([
        7, 8,
      ])

      // Extra entry fields are stripped from the snapshot
      const extraFieldRatings = createScaleScheduler({
        Manual: { value: 0, manual: true, label: 'manual' },
        Again: { value: 1, lapse: true, label: 'again' },
        Low: { value: 7, label: 'pass' },
      }).ratings
      expectTypeOf(extraFieldRatings.grades).toEqualTypeOf<readonly (1 | 7)[]>()
      // @ts-expect-error snapshot strips extra fields like label from ratings.scale
      const droppedLabel = extraFieldRatings.scale.Low.label
      expect(droppedLabel).toBeUndefined()
    })

    it.each([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 0],
      [4, 0],
      [5, 0],
    ] as const)(
      'counts grade %i as %i lapse via isLapse and rolls it back',
      (grade, lapses) => {
        const scheduler = defineScheduler({
          model: SM2SixGradeModel,
          chrono: numericChrono,
        })
          .use(schedulerStatsMiddleware)
          .create({ config: sixGradeConfig })
        // Lapses count only on Review cards, so review once first
        const reviewed = scheduler.review({
          card: scheduler.newCard({ now: 0 }),
          grade: 4,
          now: 1,
        })
        expect(reviewed.card.lapses).toBe(0)

        const after = scheduler.review({ card: reviewed.card, grade, now: 5 })
        expect(after.card.lapses).toBe(lapses)
        expect(
          scheduler.rollback({ card: after.card, revlog: after.revlog }).lapses
        ).toBe(0)
      }
    )
  })
})
