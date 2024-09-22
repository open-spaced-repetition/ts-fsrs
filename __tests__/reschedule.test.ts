import {
  createEmptyCard,
  date_diff,
  FSRS,
  fsrs,
  Grade,
  Grades,
  Rating,
  RecordLogItem,
  RescheduleOptions,
  ReviewLog,
  State,
} from '../src/fsrs'
import { FSRSHistory } from '../src/fsrs/models'

type reviewState = {
  difficulty: number
  due: Date
  rating: Rating
  review?: Date
  stability: number
  state: State
  reps: number
  lapses: number
  elapsed_days: number
  scheduled_days: number
}

const MOCK_NOW = new Date(1723338000000 /**2024, 7, 11, 1, 0, 0 UTC**/)

// https://github.com/open-spaced-repetition/ts-fsrs/issues/112#issuecomment-2286238381

function experiment(
  scheduler: FSRS,
  reviews: Array<FSRSHistory>,
  skipManual: boolean = true
) {
  if (skipManual) {
    reviews = reviews.filter((review) => review.rating !== Rating.Manual)
  }
  const output = reviews.reduce(
    (state: reviewState[], review: FSRSHistory, index: number) => {
      const currentCard = state[index - 1]
        ? {
            due: state[index - 1].due,
            stability: state[index - 1].stability,
            difficulty: state[index - 1].difficulty,
            elapsed_days:
              state[index - 2]?.review && state[index - 1]?.review
                ? date_diff(
                    state[index - 1].review!,
                    state[index - 2].review!,
                    'days'
                  )
                : 0,
            scheduled_days:
              state[index - 1].review && state[index - 1].due
                ? date_diff(
                    state[index - 1].review!,
                    state[index - 1].due,
                    'days'
                  )
                : 0,
            reps: state[index - 1].reps,
            lapses: state[index - 1].lapses,
            state: state[index - 1].state,
            last_review: state[index - 1].review,
          }
        : createEmptyCard(MOCK_NOW)

      if (review.review) {
        let card = currentCard
        let log: ReviewLog
        if (review.rating) {
          const item = scheduler.next(currentCard, review.review, review.rating)
          card = item.card
          log = item.log
        } else {
          log = state[index - 1]
            ? {
                rating: Rating.Manual,
                state: State.New,
                due: state[index - 1].due,
                stability: state[index - 1].stability,
                difficulty: state[index - 1].difficulty,
                elapsed_days: state[index - 1].elapsed_days,
                last_elapsed_days: state[index - 1].elapsed_days,
                scheduled_days: state[index - 1].scheduled_days,
                review: review.review,
              }
            : {
                rating: Rating.Manual,
                state: State.New,
                due: new Date(MOCK_NOW),
                stability: 0,
                difficulty: 0,
                elapsed_days: 0,
                last_elapsed_days: 0,
                scheduled_days: 0,
                review: review.review,
              }
          card = createEmptyCard(review.review)
        }

        return [
          ...state,
          {
            difficulty: card.difficulty,
            due: card.due,
            rating: log.rating,
            review: log.review,
            stability: card.stability,
            state: card.state,
            reps: card.reps,
            lapses: card.lapses,
            elapsed_days: card.elapsed_days,
            scheduled_days: card.scheduled_days,
          } satisfies reviewState,
        ]
      }

      return state
    },
    []
  )

  return output
}

function testReschedule<T = RecordLogItem>(
  scheduler: FSRS,
  tests: number[][],
  options: Partial<RescheduleOptions<T>> = {}
) {
  for (const test of tests) {
    const reviews = test.map((rating, index) => ({
      rating: <Grade>rating,
      review: new Date(
        new Date(MOCK_NOW).valueOf() + 1000 * 60 * 60 * 24 * (index + 1)
      ),
      state: rating === Rating.Manual ? State.New : undefined,
    }))
    const control = <RecordLogItem[]>scheduler.reschedule(reviews, options)
    const experimentResult = experiment(
      scheduler,
      reviews,
      options.skipManual ?? true
    )
    for (const [index, controlItem] of control.entries()) {
      const experimentItem = experimentResult[index]
      // console.log(controlItem, experimentItem, index, test)
      expect(controlItem.card.difficulty).toEqual(experimentItem.difficulty)
      expect(controlItem.card.due).toEqual(experimentItem.due)
      expect(controlItem.card.stability).toEqual(experimentItem.stability)
      expect(controlItem.card.state).toEqual(experimentItem.state)
      expect(controlItem.card.last_review?.getTime()).toEqual(
        experimentItem.review?.getTime()
      )
      expect(controlItem.card.reps).toEqual(experimentItem.reps)
      expect(controlItem.card.lapses).toEqual(experimentItem.lapses)

      expect(controlItem.card.elapsed_days).toEqual(experimentItem.elapsed_days)
      expect(controlItem.card.scheduled_days).toEqual(
        experimentItem.scheduled_days
      )
    }
  }
}

describe('FSRS reschedule', () => {
  const scheduler = fsrs()

  it('basic grade', () => {
    const tests: number[][] = []
    for (let i = 0; i < Grades.length; i++) {
      for (let j = 0; j < Grades.length; j++) {
        for (let k = 0; k < Grades.length; k++) {
          for (let l = 0; l < Grades.length; l++) {
            tests.push([Grades[i], Grades[j], Grades[k], Grades[l]])
          }
        }
      }
    }
    testReschedule(scheduler, tests, {
      reviewsOrderBy: (a, b) => a.review.getTime() - b.review.getTime(),
      recordLogHandler: (recordLog) => recordLog,
    })
  })

  it('case : include Manual rating -> set forget', () => {
    const tests: number[][] = []
    const Ratings = [
      Rating.Manual,
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ]
    for (let i = 0; i < Ratings.length; i++) {
      for (let j = 0; j < Ratings.length; j++) {
        for (let k = 0; k < Ratings.length; k++) {
          for (let l = 0; l < Ratings.length; l++) {
            for (let m = 0; m < Ratings.length; m++) {
              tests.push([
                Ratings[i],
                Ratings[j],
                Ratings[k],
                Ratings[l],
                Ratings[m],
              ])
            }
          }
        }
      }
    }
    console.debug('reschedule case size:', tests.length)
    testReschedule(scheduler, tests, {
      reviewsOrderBy: (a, b) => a.review.getTime() - b.review.getTime(),
      recordLogHandler: (recordLog) => recordLog,
      skipManual: false,
    })
  })

  it('case : include Manual rating -> state have not been provided', () => {
    const test = [Rating.Easy, Rating.Good, Rating.Manual, Rating.Good]
    const reviews = test.map((rating, index) => ({
      rating: <Grade>rating,
      review: new Date(
        new Date(MOCK_NOW).valueOf() + 1000 * 60 * 60 * 24 * (index + 1)
      ),
    }))
    expect(() => {
      scheduler.reschedule(reviews, { skipManual: false })
    }).toThrow('reschedule: state is required for manual rating')
  })

  it('case : include Manual rating -> due have not been provided', () => {
    const test = [Rating.Easy, Rating.Good, Rating.Manual, Rating.Good]
    const reviews = test.map((rating, index) => ({
      rating: <Grade>rating,
      review: new Date(
        new Date(MOCK_NOW).valueOf() + 1000 * 60 * 60 * 24 * (index + 1)
      ),
      state: rating === Rating.Manual ? State.Review : undefined,
    }))
    expect(() => {
      scheduler.reschedule(reviews, { skipManual: false })
    }).toThrow('reschedule: due is required for manual rating')
  })

  it('case : include Manual rating -> Manually configure the data', () => {
    const test = [Rating.Easy, Rating.Good, Rating.Manual, Rating.Good]
    const reviews = test.map(
      (rating, index) =>
        ({
          rating: <Grade>rating,
          review: new Date(
            new Date(MOCK_NOW).getTime() + 1000 * 60 * 60 * 24 * (index + 1)
          ),
          state: rating === Rating.Manual ? State.Review : undefined,
          difficulty: 3.2828565,
          stability: 21.79806877,
          due: new Date(1725469200000 /**2024-09-04T17:00:00.000Z*/),
        }) satisfies FSRSHistory
    )
    const expected = {
      card: {
        due: new Date(1725469200000 /**2024-09-04T17:00:00.000Z*/),
        stability: 21.79806877,
        difficulty: 3.2828565,
        elapsed_days: 1,
        scheduled_days: 21,
        reps: 3,
        lapses: 0,
        state: 2,
        last_review: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
      },
      log: {
        rating: 0,
        state: 2,
        due: new Date(1723510800000 /**2024-08-13T01:00:00.000Z*/),
        stability: 18.67917062,
        difficulty: 3.2828565,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 19,
        review: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
      },
    }

    const nextItemExpected = {
      card: {
        due: new Date(1725843600000 /**2024-09-09T01:00:00.000Z*/),
        stability: 24.84609459,
        difficulty: 3.2828565,
        elapsed_days: 1,
        scheduled_days: 25,
        reps: 4,
        lapses: 0,
        state: State.Review,
        last_review: new Date(1723683600000 /**2024-08-15T01:00:00.000Z*/),
      },
      log: {
        rating: Rating.Good,
        state: State.Review,
        due: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
        stability: 21.79806877,
        difficulty: 3.2828565,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 21,
        review: new Date(1723683600000 /**2024-08-15T01:00:00.000Z*/),
      },
    }

    const control = scheduler.reschedule(reviews, { skipManual: false })
    expect(control[2]).toEqual(expected)
    expect(control[3]).toEqual(nextItemExpected)
  })

  it('case : include Manual rating -> Manually configure the data and ds have not been provided', () => {
    const test = [Rating.Easy, Rating.Good, Rating.Manual, Rating.Good]
    const reviews = test.map(
      (rating, index) =>
        ({
          rating: <Grade>rating,
          review: new Date(
            new Date(MOCK_NOW).getTime() + 1000 * 60 * 60 * 24 * (index + 1)
          ),
          state: rating === Rating.Manual ? State.Review : undefined,
          due: new Date(1725469200000 /**'2024-09-04T17:00:00.000Z'*/),
        }) satisfies FSRSHistory
    )
    const expected = {
      card: {
        due: new Date(1725469200000 /**'2024-09-04T17:00:00.000Z'*/),
        stability: 18.67917062,
        difficulty: 3.2828565,
        elapsed_days: 1,
        scheduled_days: 21,
        reps: 3,
        lapses: 0,
        state: State.Review,
        last_review: new Date(1723597200000 /**'2024-08-14T01:00:00.000Z'*/),
      },
      log: {
        rating: Rating.Manual,
        state: State.Review,
        due: new Date(1723510800000 /**2024-08-13T01:00:00.000Z*/),
        stability: 18.67917062,
        difficulty: 3.2828565,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 19,
        review: new Date(1723597200000 /**'2024-08-14T01:00:00.000Z'*/),
      },
    }

    const control = scheduler.reschedule(reviews, { skipManual: false })
    expect(control[2]).toEqual(expected)
  })

  it('Handling the case of an empty set.', () => {
    const control = scheduler.reschedule([])
    expect(control).toEqual([])

    const control2 = scheduler.reschedule()
    expect(control2).toEqual([])
  })
})
