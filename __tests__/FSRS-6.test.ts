import {
  fsrs,
  Rating,
  FSRS,
  createEmptyCard,
  State,
  Grade,
  Grades,
  FSRSState,
  date_diff,
} from '../src/fsrs'

describe('FSRS-6 ', () => {
  const w = [
    0.2172, 1.1771, 3.2602, 16.1507, 7.0114, 0.57, 2.0966, 0.0069, 1.5261,
    0.112, 1.0178, 1.849, 0.1133, 0.3127, 2.2934, 0.2191, 3.0004, 0.7536,
    0.3332, 0.1437, 0.2,
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
      0, 4, 14, 45, 135, 372, 0, 0, 2, 5, 10, 20, 40,
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
      f: FSRS,
      text: string,
      expect_stability: number,
      expect_difficulty: number
    ) {
      let card = createEmptyCard()
      let now = new Date(2022, 11, 29, 12, 30, 0, 0)

      for (const [index, rating] of ratings.entries()) {
        now = new Date(+now + intervals[index] * 24 * 60 * 60 * 1000)
        card = f.next(card, now, rating).card
        console.debug(text, index + 1, card.stability, card.difficulty)
      }

      const { stability, difficulty } = card
      expect(stability).toBeCloseTo(expect_stability, 4)
      expect(difficulty).toBeCloseTo(expect_difficulty, 4)
    }
    it('memory state[short-term]', () => {
      const f: FSRS = fsrs({ w, enable_short_term: true })
      assertMemoryState(f, 'short-term', 49.4472, 6.8573)
    })

    it('memory state[long-term]', () => {
      const f: FSRS = fsrs({ w, enable_short_term: false })
      assertMemoryState(f, 'long-term', 48.6015, 6.8573)
    })

    it('memory state using next_state[short-term]', () => {
      const f: FSRS = fsrs({ w, enable_short_term: true })
      let state: FSRSState | null = null
      for (const [index, rating] of ratings.entries()) {
        state = f.next_state(state, intervals[index], rating)
      }

      const { stability, difficulty } = state!
      expect(stability).toBeCloseTo(49.4472, 4)
      expect(difficulty).toBeCloseTo(6.8573, 4)
    })

    it('memory state using next_state[long-term]', () => {
      const f: FSRS = fsrs({ w, enable_short_term: false })
      let state: FSRSState | null = null
      for (const [index, rating] of ratings.entries()) {
        state = f.next_state(state, intervals[index], rating)
      }

      const { stability, difficulty } = state!
      expect(stability).toBeCloseTo(48.6015, 4)
      expect(difficulty).toBeCloseTo(6.8573, 4)
    })
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
    expect(stability).toEqual([0.2172, 1.1771, 3.2602, 16.1507])
    expect(difficulty).toEqual([7.0114, 6.24313295, 4.88463163, 2.48243852])
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
    const r = ['100.00%', '100.00%', '100.00%', '90.07%']
    const r_number = [1, 1, 1, 0.90068938]
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
    const r = ['100.00%', '100.00%', '100.00%', '90.07%']
    const r_number = [1, 1, 1, 0.90068938]
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
