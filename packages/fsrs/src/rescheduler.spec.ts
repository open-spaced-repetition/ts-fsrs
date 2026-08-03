import { defineScheduler, Rating } from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { numericChrono } from '@open-spaced-repetition/srs-kit/chrono/numeric'
import { temporalInstantChrono } from '@open-spaced-repetition/srs-kit/chrono/temporal-instant'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from './models/fsrs-6/constants.js'
import { FSRS6Model } from './models/fsrs-6/model.js'
import type { FSRSState } from './models.js'
import { Rescheduler } from './rescheduler/index.js'

const DAY_MS = 86_400_000
const DAY_NS = 86_400_000_000_000n
const modelConfig = {
  weights: FSRS6_DEFAULT_WEIGHTS,
  enableShortTerm: true,
  numRelearningSteps: 1,
}

describe('Rescheduler', () => {
  it('rebuilds memory with one model.forward call', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).create({ config: modelConfig })
    const forward = vi.spyOn(scheduler.model, 'forward')
    const history = [
      { rating: Rating.Good, reviewTime: new Date(0) },
      { rating: Rating.Hard, reviewTime: new Date(DAY_MS) },
      { rating: Rating.Easy, reviewTime: new Date(DAY_MS * 5) },
    ] as const

    const result = new Rescheduler(scheduler).reschedule({ history })

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
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })
    const initialState = { stability: 12, difficulty: 6 }

    expect(() =>
      new Rescheduler(scheduler).reschedule({
        history: [],
        initialState,
      })
    ).toThrow('Rescheduler requires a non-empty review history')
  })

  it('rejects history that contains only manual ratings', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })

    expect(() =>
      new Rescheduler(scheduler).reschedule({
        history: [{ rating: Rating.Manual, reviewTime: 0 }],
      })
    ).toThrow('Rescheduler requires at least one non-manual review')
  })

  it('uses the configured numeric chronology', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })
    const forward = vi.spyOn(scheduler.model, 'forward')

    new Rescheduler(scheduler).reschedule({
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

  it('sorts review history by default', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })
    const forward = vi.spyOn(scheduler.model, 'forward')

    new Rescheduler(scheduler).reschedule({
      history: [
        { rating: Rating.Easy, reviewTime: 8.5 },
        { rating: Rating.Good, reviewTime: 3 },
      ],
    })

    expect(forward).toHaveBeenCalledWith({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Easy, deltaT: 5.5 },
      ],
      initialState: undefined,
    })
  })

  it('filters manual ratings before calling model.forward', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })
    const forward = vi.spyOn(scheduler.model, 'forward')

    const result = new Rescheduler(scheduler).reschedule({
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

  it('uses the configured Temporal.Instant chronology', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: temporalInstantChrono,
    }).create({
      config: {
        ...modelConfig,
        chrono: { timezone: 'UTC', fractionalDays: false },
      },
    })
    const forward = vi.spyOn(scheduler.model, 'forward')
    const first = Temporal.Instant.fromEpochNanoseconds(0n)
    const second = Temporal.Instant.fromEpochNanoseconds(DAY_NS * 3n)
    const result = new Rescheduler(scheduler).reschedule({
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
  })

  it('rejects review times that move backwards', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).create({ config: modelConfig })

    expect(() =>
      new Rescheduler(scheduler).reschedule(
        {
          history: [
            { rating: Rating.Good, reviewTime: new Date(DAY_MS) },
            { rating: Rating.Easy, reviewTime: new Date(0) },
          ],
        },
        { enableSort: false }
      )
    ).toThrow('Review times must produce finite non-negative intervals')
  })

  it('rejects review times that produce non-finite intervals', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })

    expect(() =>
      new Rescheduler(scheduler).reschedule({
        history: [
          { rating: Rating.Good, reviewTime: 0 },
          { rating: Rating.Easy, reviewTime: Number.NaN },
        ],
      })
    ).toThrow('Review times must produce finite non-negative intervals')
  })

  it('infers review time from the scheduler chronology', () => {
    const dateScheduler = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).create({ config: modelConfig })
    const numericScheduler = defineScheduler({
      model: FSRS6Model,
      chrono: numericChrono,
    }).create({ config: modelConfig })

    const invalidDateReview = () =>
      new Rescheduler(dateScheduler).reschedule({
        history: [
          {
            rating: Rating.Good,
            // @ts-expect-error Date chronology requires Date review times
            reviewTime: 1,
          },
        ],
      })
    const invalidNumericReview = () =>
      new Rescheduler(numericScheduler).reschedule({
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
