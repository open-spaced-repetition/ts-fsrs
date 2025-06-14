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
  TypeConvert,
} from '../src/fsrs'
import { Card, FSRSHistory } from '../src/fsrs/models'

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
  learning_steps: number
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
            learning_steps: state[index - 1].learning_steps,
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
          review.review = TypeConvert.time(review.review)
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
                learning_steps: state[index - 1].learning_steps,
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
                learning_steps: 0,
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
            learning_steps: card.learning_steps,
          } satisfies reviewState,
        ]
      }

      return state
    },
    []
  )

  return output
}

function testReschedule(
  scheduler: FSRS,
  tests: number[][],
  options: Partial<RescheduleOptions> = {}
) {
  for (const test of tests) {
    const reviews = test.map((rating, index) => ({
      rating: <Grade>rating,
      review: new Date(
        new Date(MOCK_NOW).valueOf() + 1000 * 60 * 60 * 24 * (index + 1)
      ),
      state: rating === Rating.Manual ? State.New : undefined,
    }))
    const { collections: control } = scheduler.reschedule(
      createEmptyCard(),
      reviews,
      options
    )
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
      reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) =>
        date_diff(a.review, b.review, 'days'),
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
      reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) =>
        date_diff(a.review, b.review, 'days'),
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
      scheduler.reschedule(createEmptyCard(), reviews, { skipManual: false })
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
      scheduler.reschedule(createEmptyCard(), reviews, { skipManual: false })
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
        learning_steps: 0,
        state: 2,
        last_review: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
      } satisfies Card,
      log: {
        rating: 0,
        state: 2,
        due: new Date(1723510800000 /**2024-08-13T01:00:00.000Z*/),
        stability: 13.48506225,
        difficulty: 1,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 13,
        learning_steps: 0,
        review: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
      } satisfies ReviewLog,
    }

    const nextItemExpected = {
      card: {
        due: new Date(1725843600000 /**2024-09-09T01:00:00.000Z*/),
        stability: 25.33029347,
        difficulty: 3.27480201,
        elapsed_days: 1,
        scheduled_days: 25,
        reps: 4,
        lapses: 0,
        learning_steps: 0,
        state: State.Review,
        last_review: new Date(1723683600000 /**2024-08-15T01:00:00.000Z*/),
      } satisfies Card,
      log: {
        rating: Rating.Good,
        state: State.Review,
        due: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
        stability: 21.79806877,
        difficulty: 3.2828565,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 21,
        learning_steps: 0,
        review: new Date(1723683600000 /**2024-08-15T01:00:00.000Z*/),
      } satisfies ReviewLog,
    }

    const { collections: control } = scheduler.reschedule(
      createEmptyCard(),
      reviews,
      {
        skipManual: false,
        now: new Date(1725843600000 /**2024-09-09T01:00:00.000Z*/),
      }
    )
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
        stability: 13.48506225,
        difficulty: 1,
        elapsed_days: 1,
        scheduled_days: 21,
        reps: 3,
        lapses: 0,
        learning_steps: 0,
        state: State.Review,
        last_review: new Date(1723597200000 /**'2024-08-14T01:00:00.000Z'*/),
      } satisfies Card,
      log: {
        rating: Rating.Manual,
        state: State.Review,
        due: new Date(1723510800000 /**2024-08-13T01:00:00.000Z*/),
        stability: 13.48506225,
        difficulty: 1,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 13,
        learning_steps: 0,
        review: new Date(1723597200000 /**'2024-08-14T01:00:00.000Z'*/),
      } satisfies ReviewLog,
    }

    const current_card = {
      due: new Date(1725238800000 /**2024-09-02T01:00:00.000Z*/),
      stability: 21.79806877,
      difficulty: 3.2828565,
      elapsed_days: 1,
      scheduled_days: 2,
      reps: 5,
      lapses: 0,
      learning_steps: 0,
      state: State.Review,
      last_review: new Date(1725584400000 /**'2024-08-15T01:00:00.000Z'*/),
    }

    const { collections: control, reschedule_item } = scheduler.reschedule(
      current_card,
      reviews,
      {
        skipManual: false,
        now: new Date(1725584400000 /**'2024-09-06T01:00:00.000Z'*/),
      }
    )
    expect(control[2]).toEqual(expected)
    expect(reschedule_item).toBeNull()
  })

  it('case : get reschedule item', () => {
    const test = [Rating.Easy, Rating.Good, Rating.Good, Rating.Good]
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
        due: new Date(1725670800000 /**2024-09-07T01:00:00.000Z*/),
        stability: 23.06595495,
        difficulty: 1,
        elapsed_days: 1,
        scheduled_days: 23,
        reps: 4,
        lapses: 0,
        learning_steps: 0,
        state: State.Review,
        last_review: new Date(1723683600000 /**'2024-08-15T01:00:00.000Z'*/),
      } satisfies Card,
      log: {
        rating: Rating.Good,
        state: State.Review,
        due: new Date(1723597200000 /**2024-08-14T01:00:00.000Z*/),
        stability: 18.37626562,
        difficulty: 1,
        elapsed_days: 1,
        last_elapsed_days: 1,
        scheduled_days: 18,
        learning_steps: 0,
        review: new Date(1723683600000 /**'2024-08-15T01:00:00.000Z'*/),
      } satisfies ReviewLog,
    }
    let cur_card = createEmptyCard(MOCK_NOW)
    let index = 0
    const review_at = new Date(1723683600000 /**'2024-08-15T01:00:00.000Z'*/)
    for (const _ of test) {
      const { collections: control, reschedule_item } = scheduler.reschedule(
        cur_card,
        reviews,
        {
          skipManual: false,
          update_memory_state: true,
          now: review_at,
        }
      )
      const scheduled_days = date_diff(
        reschedule_item!.card.due,
        cur_card.due,
        'days'
      )
      expect(control[control.length - 1]).toEqual(expected)
      expect(reschedule_item).toEqual({
        card: {
          ...expected.card,
          last_review: review_at,
          reps: cur_card.reps + 1,
          learning_steps: 0,
        } satisfies Card,
        log: {
          ...expected.log,
          rating: Rating.Manual,
          state: cur_card.state,
          due: cur_card.last_review || cur_card.due,
          last_elapsed_days: cur_card.elapsed_days,
          scheduled_days: scheduled_days,
          stability: cur_card.stability,
          difficulty: cur_card.difficulty,
          learning_steps: 0,
          review: review_at,
        } satisfies ReviewLog,
      } satisfies RecordLogItem)
      cur_card = control[index++].card
      // index++
    }
  })

  it('Handling the case of an empty set.', () => {
    const control = scheduler.reschedule(createEmptyCard(), [])
    expect(control).toEqual({
      collections: [],
      reschedule_item: null,
    })

    const control2 = scheduler.reschedule(createEmptyCard())
    expect(control2).toEqual({
      collections: [],
      reschedule_item: null,
    })
  })

  it('case : basic test', () => {
    const f = fsrs()
    const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
    const reviews_at = [
      new Date(2024, 8, 13),
      new Date(2024, 8, 13),
      new Date(2024, 8, 17),
      new Date(2024, 8, 28),
    ]

    const reviews: FSRSHistory[] = []
    for (let i = 0; i < grades.length; i++) {
      reviews.push({
        rating: grades[i],
        review: reviews_at[i],
      })
    }

    const results_short = f.reschedule(createEmptyCard(), reviews, {
      skipManual: false,
    })
    const ivl_history_short = results_short.collections.map(
      (item) => item.card.scheduled_days
    )
    const s_history_short = results_short.collections.map(
      (item) => item.card.stability
    )
    const d_history_short = results_short.collections.map(
      (item) => item.card.difficulty
    )

    expect(results_short.reschedule_item).not.toBeNull()
    expect(results_short.collections.length).toEqual(4)
    expect(ivl_history_short).toEqual([0, 2, 16, 53])
    expect(s_history_short).toEqual([
      2.3065, 2.3065, 16.18802274, 52.76325584,
    ])
    expect(d_history_short).toEqual([
      2.11810397, 2.11121424, 2.1043314, 2.09745544,
    ])

    // switch long-term scheduler
    f.parameters.enable_short_term = false
    const results = f.reschedule(createEmptyCard(), reviews, {
      skipManual: false,
    })
    const ivl_history_long = results.collections.map(
      (item) => item.card.scheduled_days
    )
    const s_history_long = results.collections.map(
      (item) => item.card.stability
    )
    const d_history_long = results.collections.map(
      (item) => item.card.difficulty
    )
    expect(results.reschedule_item).not.toBeNull()
    expect(results.collections.length).toEqual(4)
    expect(ivl_history_long).toEqual([3, 3, 16, 53])
    expect(s_history_long).toEqual([2.3065, 2.3065, 16.18802274, 52.76325584])
    expect(d_history_long).toEqual([
      2.11810397, 2.11121424, 2.1043314, 2.09745544,
    ])
  })

  it('case : current card = reschedule card', () => {
    const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
    const reviews_at: number[] = [
      Date.UTC(2024, 8, 13, 0, 0, 0),
      Date.UTC(2024, 8, 13, 0, 0, 0),
      Date.UTC(2024, 8, 17, 0, 0, 0),
      Date.UTC(2024, 8, 28, 0, 0, 0),
    ]

    const reviews: FSRSHistory[] = []
    for (let i = 0; i < grades.length; i++) {
      reviews.push({
        rating: grades[i],
        review: reviews_at[i],
      })
    }
    const current_card = {
      due: new Date(1732060800000 /** 2024-11-20T00:00:00.000Z */),
      stability: 52.44876819,
      difficulty: 2.11475301,
      elapsed_days: 11,
      scheduled_days: 52,
      reps: 4,
      lapses: 0,
      learning_steps: 0,
      state: State.Review,
      last_review: new Date(2024, 9, 28, 0, 0, 0),
    }

    const results_short = scheduler.reschedule(current_card, reviews, {
      recordLogHandler: (recordLog) => {
        return recordLog
      },
      skipManual: false,
      first_card: createEmptyCard(Date.UTC(2024, 8, 13, 0, 0, 0)),
      update_memory_state: true,
      now: Date.UTC(2024, 9, 27, 0, 0, 0),
    })
    expect(results_short.reschedule_item).toBeNull()
  })

  it('case : forget', () => {
    const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
    const reviews_at: number[] = [
      Date.UTC(2024, 8, 13, 0, 0, 0),
      Date.UTC(2024, 8, 13, 0, 0, 0),
      Date.UTC(2024, 8, 17, 0, 0, 0),
      Date.UTC(2024, 8, 28, 0, 0, 0),
    ]

    const reviews: FSRSHistory[] = []
    for (let i = 0; i < grades.length; i++) {
      reviews.push({
        rating: grades[i],
        review: reviews_at[i],
      })
    }
    const first_card = createEmptyCard(Date.UTC(2024, 8, 28, 0, 0, 0))
    let current_card: Card = createEmptyCard()
    const history_card: Card[] = []
    for (const review of reviews) {
      const item = scheduler.next(
        current_card,
        review.review,
        <Grade>review.rating
      )
      current_card = item.card
      history_card.push(current_card)
    }
    const { card: forget_card } = scheduler.forget(
      current_card,
      Date.UTC(2024, 9, 27, 0, 0, 0)
    )
    current_card = forget_card

    const { reschedule_item } = scheduler.reschedule(current_card!, reviews, {
      first_card: first_card,
      update_memory_state: true,
      now: Date.UTC(2024, 9, 27, 0, 0, 0),
    })
    expect(reschedule_item).not.toBeNull()
    expect(reschedule_item!.card.due).toEqual(
      history_card[history_card.length - 1].due
    )
    expect(reschedule_item!.card.stability).toEqual(
      history_card[history_card.length - 1].stability
    )
    expect(reschedule_item!.card.difficulty).toEqual(
      history_card[history_card.length - 1].difficulty
    )
  })
})
