import {
  defineChrono,
  defineScheduler,
  defineSchema,
  Rating,
  SRSSchemaError,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { numericChrono } from '@open-spaced-repetition/srs-kit/chrono/numeric'
import { temporalInstantChrono } from '@open-spaced-repetition/srs-kit/chrono/temporal-instant'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { FSRSValidationError } from '@/error.js'
import type { FSRSState } from '@/kit/types.js'
import { FSRS6_DEFAULT_WEIGHTS } from '@/models/fsrs-6/constants.js'
import { FSRS6Model } from '@/models/fsrs-6/model.js'
import { Reschedule } from './index.js'

const DAY_MS = 86_400_000
const DAY_NS = 86_400_000_000_000n
const modelConfig = {
  weights: FSRS6_DEFAULT_WEIGHTS,
  enableShortTerm: true,
  numRelearningSteps: 1,
}

const dateScheduler = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).create({ config: modelConfig })
const numericScheduler = defineScheduler({
  model: FSRS6Model,
  chrono: numericChrono,
}).create({ config: modelConfig })
const dateReschedule = new Reschedule(dateScheduler)
const numericReschedule = new Reschedule(numericScheduler)

/**
 * Built on first use: `Temporal` is only available on Node.js 26+, and
 * creating the scheduler at module scope would fail the whole file on older
 * runtimes instead of just the Temporal test.
 */
const createTemporalFixture = () => {
  const scheduler = defineScheduler({
    model: FSRS6Model,
    chrono: temporalInstantChrono,
  }).create({
    config: {
      ...modelConfig,
      chrono: { timezone: 'UTC', fractionalDays: false },
    },
  })

  return { scheduler, reschedule: new Reschedule(scheduler) }
}
let temporalFixture: ReturnType<typeof createTemporalFixture> | undefined
const temporal = () => (temporalFixture ??= createTemporalFixture())

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Reschedule', () => {
  it('rebuilds memory with one model.forward call', () => {
    const forward = vi.spyOn(dateScheduler.model, 'forward')
    const history = [
      { rating: Rating.Good, reviewTime: new Date(DAY_MS) },
      { rating: Rating.Hard, reviewTime: new Date(DAY_MS * 2) },
      { rating: Rating.Easy, reviewTime: new Date(DAY_MS * 6) },
    ] as const

    const result = dateReschedule.replay({ history })

    expect(forward).toHaveBeenCalledOnce()
    expect(forward).toHaveBeenCalledWith({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Hard, deltaT: 1 },
        { rating: Rating.Easy, deltaT: 4 },
      ],
      initialState: undefined,
    })
    expect(result.memoryStates).toEqual(forward.mock.results[0].value)
    expect(result.memoryState).toEqual(
      result.memoryStates[result.memoryStates.length - 1]
    )
    expect(Object.keys(result)).toEqual(['memoryState', 'memoryStates'])
    expectTypeOf(result.memoryStates).toEqualTypeOf<FSRSState[]>()
    expectTypeOf(result.memoryState).toEqualTypeOf<FSRSState>()
  })

  it('rejects empty history even when an initial state is provided', () => {
    const initialState = { stability: 12, difficulty: 6 }

    expect(() =>
      numericReschedule.replay({
        history: [],
        initialState,
      })
    ).toThrow(FSRSValidationError)
  })

  it('rejects history that contains only manual ratings', () => {
    expect(() =>
      numericReschedule.replay({
        history: [{ rating: Rating.Manual, reviewTime: 0 }],
      })
    ).toThrow(FSRSValidationError)
  })

  it('validates review ratings', () => {
    expect(() =>
      numericReschedule.replay({
        history: [{ rating: 5 as Rating, reviewTime: 0 }],
      })
    ).toThrow(SRSSchemaError)
  })

  it('uses the configured numeric chronology', () => {
    const forward = vi.spyOn(numericScheduler.model, 'forward')

    numericReschedule.replay({
      history: [
        { rating: Rating.Good, reviewTime: 3 },
        { rating: Rating.Again, reviewTime: 8.5 },
      ],
    })

    expect(forward).toHaveBeenCalledWith({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Again, deltaT: 5.5 },
      ],
      initialState: undefined,
    })
  })

  it('parses review times before sorting and calculating intervals', () => {
    const compare = vi.fn((left: number, right: number) => left - right)
    const chrono = defineChrono({
      schema: {
        time: defineSchema<number, number>((value) =>
          typeof value === 'number'
            ? { value: value * 2 }
            : { issues: [{ message: 'Expected numeric review time' }] }
        ),
      },
      projection(value) {
        return { value: { previous: value.time, current: value.time } }
      },
      create() {
        return {
          now: () => 0,
          compare,
          difference: (from, to) => to - from,
          add: (from, days) => from + days,
        }
      },
    })
    const scheduler = defineScheduler({ model: FSRS6Model, chrono }).create({
      config: modelConfig,
    })
    const forward = vi.spyOn(scheduler.model, 'forward')
    const history = [
      { rating: Rating.Easy, reviewTime: 3 },
      { rating: Rating.Good, reviewTime: 1 },
    ] as const
    const originalHistory = [...history]

    new Reschedule(scheduler).replay({ history })

    expect(compare).toHaveBeenCalledWith(2, 6)
    expect(forward).toHaveBeenCalledWith({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Easy, deltaT: 4 },
      ],
      initialState: undefined,
    })
    expect(history).toEqual(originalHistory)
  })

  it('filters manual ratings before calling model.forward', () => {
    const forward = vi.spyOn(numericScheduler.model, 'forward')

    const result = numericReschedule.replay({
      history: [
        { rating: Rating.Good, reviewTime: 3 },
        { rating: Rating.Manual, reviewTime: 4 },
        { rating: Rating.Again, reviewTime: 8.5 },
      ],
    })

    expect(forward).toHaveBeenCalledWith({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Again, deltaT: 5.5 },
      ],
      initialState: undefined,
    })
    expect(result.memoryStates).toHaveLength(2)
  })

  it.skipIf(globalThis.Temporal?.Instant === undefined)(
    'uses the configured Temporal.Instant chronology',
    () => {
      const { scheduler, reschedule } = temporal()
      const forward = vi.spyOn(scheduler.model, 'forward')
      const first = Temporal.Instant.fromEpochNanoseconds(0n)
      const second = Temporal.Instant.fromEpochNanoseconds(DAY_NS * 3n)
      const result = reschedule.replay({
        history: [
          { rating: Rating.Good, reviewTime: first },
          { rating: Rating.Easy, reviewTime: second },
        ],
      })

      expect(forward).toHaveBeenCalledWith({
        history: [
          { rating: Rating.Good, deltaT: 0 },
          { rating: Rating.Easy, deltaT: 3 },
        ],
        initialState: undefined,
      })
      expectTypeOf(result.memoryState).toEqualTypeOf<FSRSState>()
    }
  )

  it('rejects review times that move backwards', () => {
    expect(() =>
      dateReschedule.replay(
        {
          history: [
            { rating: Rating.Good, reviewTime: new Date(DAY_MS * 2) },
            { rating: Rating.Easy, reviewTime: new Date(DAY_MS) },
          ],
        },
        { sortHistory: false }
      )
    ).toThrow('Review times must produce finite non-negative intervals')
  })

  it('rejects review times that produce non-finite intervals', () => {
    vi.spyOn(numericScheduler.chrono, 'difference').mockReturnValue(Number.NaN)

    expect(() =>
      numericReschedule.replay({
        history: [
          { rating: Rating.Good, reviewTime: 0 },
          { rating: Rating.Easy, reviewTime: 1 },
        ],
      })
    ).toThrow('Review times must produce finite non-negative intervals')
  })

  it('infers review time from the scheduler chronology', () => {
    const invalidDateReview = () =>
      dateReschedule.replay({
        history: [
          {
            rating: Rating.Good,
            // @ts-expect-error Date chronology requires Date review times
            reviewTime: 1,
          },
        ],
      })
    const invalidNumericReview = () =>
      numericReschedule.replay({
        history: [
          {
            rating: Rating.Good,
            // @ts-expect-error numeric chronology requires number review times
            reviewTime: new Date(),
          },
        ],
      })

    expectTypeOf(invalidDateReview).toBeFunction()
    expectTypeOf(invalidNumericReview).toBeFunction()
  })
})

describe('Reschedule.reschedule', () => {
  it('passes reviews to scheduler.forward without model intervals', () => {
    const forward = vi.spyOn(numericScheduler, 'forward')
    const history = [
      { rating: Rating.Good, reviewTime: 1 },
      { rating: Rating.Easy, reviewTime: 3 },
    ] as const

    numericReschedule.reschedule({ history }, { sortHistory: false })

    expect(forward).toHaveBeenCalledWith({
      history,
      initialCard: undefined,
    })
  })

  it('returns one card and revlog per review', () => {
    const result = dateReschedule.reschedule({
      history: [
        { rating: Rating.Good, reviewTime: new Date(DAY_MS) },
        { rating: Rating.Hard, reviewTime: new Date(DAY_MS * 2) },
        { rating: Rating.Again, reviewTime: new Date(DAY_MS * 6) },
      ],
    })

    expect(result.results).toHaveLength(3)
    expect(result.card).toEqual(result.results[2].card)
    expect(result.results[2].revlog.rating).toBe(Rating.Again)
    expect(result.card.state).toBe(State.Review)
    expect(result.card.dueAt.getTime()).toBeGreaterThan(DAY_MS * 6)
  })

  it('matches an equivalent chain of scheduler.review calls', () => {
    const history = [
      { rating: Rating.Good, reviewTime: new Date(DAY_MS) },
      { rating: Rating.Easy, reviewTime: new Date(DAY_MS * 4) },
    ] as const

    const { results } = dateReschedule.reschedule({ history })

    let card = dateScheduler.newCard({ now: history[0].reviewTime })
    const expected = history.map((review) => {
      const item = dateScheduler.review({
        card,
        grade: review.rating,
        now: review.reviewTime,
      })
      card = item.card
      return item
    })

    expect(results).toEqual(expected)
  })

  it('sorts and filters the history like replay does', () => {
    const { results } = dateReschedule.reschedule({
      history: [
        { rating: Rating.Easy, reviewTime: new Date(DAY_MS * 4) },
        { rating: Rating.Manual, reviewTime: new Date(DAY_MS * 2) },
        { rating: Rating.Good, reviewTime: new Date(DAY_MS) },
      ],
    })

    expect(results).toHaveLength(2)
    expect(results[0].revlog.rating).toBe(Rating.Good)
    expect(results[1].revlog.rating).toBe(Rating.Easy)
  })

  it('starts from the given initial card', () => {
    const seeded = dateScheduler.review({
      card: dateScheduler.newCard({ now: new Date(DAY_MS) }),
      grade: Rating.Good,
      now: new Date(DAY_MS),
    })

    const { results } = dateReschedule.reschedule({
      initialCard: seeded.card,
      history: [{ rating: Rating.Good, reviewTime: new Date(DAY_MS * 3) }],
    })

    expect(results).toHaveLength(1)
    expect(results[0].revlog.state).toBe(State.Review)
  })

  it('rejects history without a non-manual review', () => {
    expect(() =>
      dateReschedule.reschedule({
        history: [{ rating: Rating.Manual, reviewTime: new Date(DAY_MS) }],
      })
    ).toThrow(FSRSValidationError)
  })

  it('rejects review times that move backwards', () => {
    const history = [
      { rating: Rating.Good, reviewTime: new Date(DAY_MS * 10) },
      { rating: Rating.Good, reviewTime: new Date(0) },
    ] as const

    expect(() =>
      dateReschedule.reschedule({ history }, { sortHistory: false })
    ).toThrow(SRSSchemaError)
  })

  it('rejects review times that produce non-finite intervals', () => {
    expect(() =>
      numericReschedule.reschedule({
        history: [
          { rating: Rating.Good, reviewTime: 0 },
          { rating: Rating.Easy, reviewTime: Number.NaN },
        ],
      })
    ).toThrow(SRSSchemaError)
  })
})
