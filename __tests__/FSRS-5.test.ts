import {
  createEmptyCard,
  date_diff,
  FSRS,
  fsrs,
  type Grade,
  Grades,
  Rating,
  State,
} from '../src/fsrs'

describe('FSRS-5', () => {
  const w = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
    0.6621,
  ]
  const f: FSRS = fsrs({ w })
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
      for (const check of Grades) {
        const rollbackCard = f.rollback(
          scheduling_cards[check].card,
          scheduling_cards[check].log
        )
        expect(rollbackCard).toEqual(card)
        expect(scheduling_cards[check].log.elapsed_days).toEqual(
          card.last_review
            ? date_diff(now, card.last_review as Date, 'days')
            : 0
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
      0, 4, 14, 44, 125, 328, 0, 0, 7, 16, 34, 71, 142,
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

    const { stability, difficulty } = scheduling_cards[Rating.Good].card
    expect(stability).toBeCloseTo(48.4848, 4)
    expect(difficulty).toBeCloseTo(7.0866, 4)
  })

  it('first repeat', () => {
    const card = createEmptyCard()
    const now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const scheduling_cards = f.repeat(card, now)

    const stability: number[] = []
    const difficulty: number[] = []
    const elapsed_days: number[] = []
    const scheduled_days: number[] = []
    const reps: number[] = []
    const lapses: number[] = []
    const states: State[] = []
    for (const item of scheduling_cards) {
      const first_card = item.card
      stability.push(first_card.stability)
      difficulty.push(first_card.difficulty)
      reps.push(first_card.reps)
      lapses.push(first_card.lapses)
      elapsed_days.push(first_card.elapsed_days)
      scheduled_days.push(first_card.scheduled_days)
      states.push(first_card.state)
    }
    expect(stability).toEqual([0.40255, 1.18385, 3.173, 15.69105])
    expect(difficulty).toEqual([7.1949, 6.48830527, 5.28243442, 3.22450159])
    expect(reps).toEqual([1, 1, 1, 1])
    expect(lapses).toEqual([0, 0, 0, 0])
    expect(elapsed_days).toEqual([0, 0, 0, 0])
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
  const fsrs = new FSRS({})
  test('return 0.00% for new cards', () => {
    const card = createEmptyCard()
    const now = new Date()
    const expected = '0.00%'
    expect(fsrs.get_retrievability(card, now)).toBe(expected)
  })

  test('return retrievability percentage for review cards', () => {
    const card = createEmptyCard('2023-12-01 04:00:00')
    const sc = fsrs.repeat(card, '2023-12-01 04:05:00')
    const r = ['100.00%', '100.00%', '100.00%', '90.25%']
    const r_number = [1, 1, 1, 0.9024733]
    Grades.forEach((grade, index) => {
      expect(fsrs.get_retrievability(sc[grade].card, sc[grade].card.due)).toBe(
        r[index]
      )
      expect(
        fsrs.get_retrievability(sc[grade].card, sc[grade].card.due, false)
      ).toBe(r_number[index])
    })
  })

  test('fake the current system time', () => {
    const card = createEmptyCard('2023-12-01 04:00:00')
    const sc = fsrs.repeat(card, '2023-12-01 04:05:00')
    const r = ['100.00%', '100.00%', '100.00%', '90.25%']
    const r_number = [1, 1, 1, 0.9024733]
    jest.useFakeTimers()
    Grades.forEach((grade, index) => {
      jest.setSystemTime(sc[grade].card.due)
      expect(fsrs.get_retrievability(sc[grade].card)).toBe(r[index])
      expect(fsrs.get_retrievability(sc[grade].card, undefined, false)).toBe(
        r_number[index]
      )
    })
    jest.useRealTimers()
  })

  test('loop Again', () => {
    const fsrs = new FSRS({})
    let card = createEmptyCard()
    let now = new Date()
    let i = 0
    while (i < 5) {
      card = fsrs.next(card, now, Rating.Again).card
      now = card.due
      i++

      const r = fsrs.get_retrievability(card, now, false)
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
