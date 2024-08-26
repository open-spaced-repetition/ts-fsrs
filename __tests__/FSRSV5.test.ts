import {
  fsrs,
  Rating,
  FSRS,
  createEmptyCard,
  State,
  Grade,
  Grades,
} from '../src/fsrs'

describe('FSRS V5 ', () => {
  const w = [
    0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477, 1.0007, 0.0674, 1.6597,
    0.1712, 1.1178, 2.0225, 0.0904, 0.3025, 2.1214, 0.2498, 2.9466, 0.4891,
    0.6468,
  ]
  const f: FSRS = fsrs({ w })
  const grade: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
  it('ivl_history', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    let scheduling_cards = f.repeat(card, now)
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
      for (const check of grade) {
        const rollbackCard = f.rollback(
          scheduling_cards[check].card,
          scheduling_cards[check].log
        )
        expect(rollbackCard).toEqual(card)
        expect(scheduling_cards[check].log.elapsed_days).toEqual(
          card.last_review ? now.diff(card.last_review as Date, 'days') : 0
        )
        const _f = fsrs({ w })
        const next = _f.next(card, now, check)
        expect(scheduling_cards[check]).toEqual(next)
      }
      card = scheduling_cards[rating].card
      const ivl = card.scheduled_days
      ivl_history.push(ivl)
      now = card.due
      scheduling_cards = f.repeat(card, now)
    }
    expect(ivl_history).toEqual([
      0, 4, 17, 62, 198, 563, 0, 0, 9, 27, 74, 190, 457,
    ])
  })

  it('memory state', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    let scheduling_cards = f.repeat(card, now)
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const intervals: number[] = [0, 0, 1, 3, 8, 21]
    for (const [index, rating] of ratings.entries()) {
      card = scheduling_cards[rating].card
      now = new Date(now.getTime() + intervals[index] * 24 * 60 * 60 * 1000)
      scheduling_cards = f.repeat(card, now)
    }

    expect(scheduling_cards[Rating.Good].card.stability).toBeCloseTo(71.4554, 4)
    expect(scheduling_cards[Rating.Good].card.difficulty).toBeCloseTo(5.0976, 4)
  })

  it('first repeat', () => {
    const card = createEmptyCard()
    const now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const scheduling_cards = f.repeat(card, now)
    const grades: Grade[] = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ]

    const stability: number[] = []
    const difficulty: number[] = []
    const elapsed_days: number[] = []
    const scheduled_days: number[] = []
    const reps: number[] = []
    const lapses: number[] = []
    const states: State[] = []
    for (const rating of grades) {
      const first_card = scheduling_cards[rating].card
      stability.push(first_card.stability)
      difficulty.push(first_card.difficulty)
      reps.push(first_card.reps)
      lapses.push(first_card.lapses)
      elapsed_days.push(first_card.elapsed_days)
      scheduled_days.push(first_card.scheduled_days)
      states.push(first_card.state)
    }
    expect(stability).toEqual([0.4197, 1.1869, 3.0412, 15.2441])
    expect(difficulty).toEqual([7.1434, 6.23225985, 4.49094334, 1.16304343])
    expect(reps).toEqual([1, 1, 1, 1])
    expect(lapses).toEqual([0, 0, 0, 0])
    expect(elapsed_days).toEqual([0, 0, 0, 0])
    expect(scheduled_days).toEqual([0, 0, 0, 15])
    expect(states).toEqual([
      State.Learning,
      State.Learning,
      State.Learning,
      State.Review,
    ])
  })
})

describe('get retrievability', () => {
  const fsrs = new FSRS({})
  test('return undefined for non-review cards', () => {
    const card = createEmptyCard()
    const now = new Date()
    const expected = undefined
    expect(fsrs.get_retrievability(card, now)).toBe(expected)
  })

  test('return retrievability percentage for review cards', () => {
    const card = createEmptyCard('2023-12-01 04:00:00')
    const sc = fsrs.repeat(card, '2023-12-01 04:05:00')
    const r = [undefined, undefined, undefined, '90.26%']
    const r_number = [undefined, undefined, undefined, 0.90260891]
    Grades.forEach((grade, index) => {
      expect(fsrs.get_retrievability(sc[grade].card, sc[grade].card.due)).toBe(
        r[index]
      )
      expect(
        fsrs.get_retrievability(sc[grade].card, sc[grade].card.due, false)
      ).toBe(r_number[index])
    })
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
