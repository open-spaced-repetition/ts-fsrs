import {
  CardInput,
  createEmptyCard,
  fsrs,
  generatorParameters,
  Grade,
  Rating,
  State,
} from '../../src/fsrs'

describe('Long-term  scheduler', () => {
  const w = [
    0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477, 1.0007, 0.0674, 1.6597,
    0.1712, 1.1178, 2.0225, 0.0904, 0.3025, 2.1214, 0.2498, 2.9466, 0.4891,
    0.6468,
  ]
  const params = generatorParameters({ w, enable_short_term: false })
  const f = fsrs(params)
  // Grades => const grade: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

  test('test1', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
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
    const s_history: number[] = []
    const d_history: number[] = []
    for (const rating of ratings) {
      const record = f.repeat(card, now)[rating]
      // https://github.com/open-spaced-repetition/ts-fsrs/issues/105
      const next = fsrs(params).next(card, now, rating)
      expect(record).toEqual(next)

      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }
    expect(ivl_history).toEqual([
      3, 13, 48, 155, 445, 1158, 17, 3, 9, 27, 74, 190, 457,
    ])
    expect(s_history).toEqual([
      3.0412, 13.09130698, 48.15848988, 154.93732625, 445.05562739,
      1158.07779739, 16.63063166, 2.98878859, 9.46334669, 26.94735845,
      73.97228121, 189.70368068, 457.43785852,
    ])
    expect(d_history).toEqual([
      4.49094334, 4.26664289, 4.05746029, 3.86237659, 3.68044154, 3.51076891,
      5.21903785, 6.81216947, 6.43141837, 6.0763299, 5.74517439, 5.43633876,
      5.14831865,
    ])
  })

  test('test2', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ]
    const ivl_history: number[] = []
    const s_history: number[] = []
    const d_history: number[] = []
    for (const rating of ratings) {
      const record = f.repeat(card, now)[rating]
      // https://github.com/open-spaced-repetition/ts-fsrs/issues/105
      const next = fsrs(params).next(card, now, rating)
      expect(record).toEqual(next)

      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }
    expect(ivl_history).toEqual([1, 2, 5, 31, 4, 6, 14, 71])

    expect(s_history).toEqual([
      0.4197, 1.0344317, 4.81220091, 31.07244353, 3.94952214, 5.69573414,
      14.10008388, 71.33039653,
    ])
    expect(d_history).toEqual([
      7.1434, 7.67357679, 7.23476684, 5.89227986, 7.44003496, 7.95021855,
      7.49276295, 6.13288703,
    ])
  })

  test('test3', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const ratings: Grade[] = [
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
      Rating.Again,
    ]
    const ivl_history: number[] = []
    const s_history: number[] = []
    const d_history: number[] = []
    for (const rating of ratings) {
      const record = f.repeat(card, now)[rating]
      // https://github.com/open-spaced-repetition/ts-fsrs/issues/105
      const next = fsrs(params).next(card, now, rating)
      expect(record).toEqual(next)

      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }
    expect(ivl_history).toEqual([2, 7, 54, 5, 8, 22, 130, 7])

    expect(s_history).toEqual([
      1.1869, 6.59167572, 53.76078737, 5.13329038, 7.91598767, 22.353464,
      129.65007831, 7.25750204,
    ])
    expect(d_history).toEqual([
      6.23225985, 5.89059466, 4.63870489, 6.27095095, 6.8599308, 6.47596059,
      5.18461715, 6.78006872,
    ])
  })

  test('test4', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const ratings: Grade[] = [
      Rating.Good,
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
    ]
    const ivl_history: number[] = []
    const s_history: number[] = []
    const d_history: number[] = []
    for (const rating of ratings) {
      const record = f.repeat(card, now)[rating]
      // https://github.com/open-spaced-repetition/ts-fsrs/issues/105
      const next = fsrs(params).next(card, now, rating)
      expect(record).toEqual(next)

      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }
    expect(ivl_history).toEqual([3, 33, 4, 7, 24, 166, 8, 13])

    expect(s_history).toEqual([
      3.0412, 32.65484522, 4.26210549, 7.16183801, 23.58957904, 166.25211957,
      8.13553136, 12.60456051,
    ])
    expect(d_history).toEqual([
      4.49094334, 3.33339007, 5.05361435, 5.72464269, 5.4171909, 4.19720854,
      5.85921145, 6.47594255,
    ])
  })
  test('test5', () => {
    let card = createEmptyCard()
    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    const ratings: Grade[] = [
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
      Rating.Good,
    ]
    const ivl_history: number[] = []
    const s_history: number[] = []
    const d_history: number[] = []
    for (const rating of ratings) {
      const record = f.repeat(card, now)[rating]
      // https://github.com/open-spaced-repetition/ts-fsrs/issues/105
      const next = fsrs(params).next(card, now, rating)
      expect(record).toEqual(next)

      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }
    expect(ivl_history).toEqual([15, 3, 6, 26, 226, 10, 17, 55])

    expect(s_history).toEqual([
      15.2441, 3.25621013, 6.31387378, 25.90156323, 226.22071942, 9.55915065,
      16.56937382, 55.3790909,
    ])
    expect(d_history).toEqual([
      1.16304343, 3.02954907, 3.83699941, 3.65677478, 2.55544447, 4.32810228,
      5.04803013, 4.78618203,
    ])
  })

  test('[State.(Re)Learning]switch long-term scheduler', () => {
    // Good(short)->Good(long)->Again(long)->Good(long)->Good(short)->Again(short)
    const ivl_history: number[] = []
    const s_history: number[] = []
    const d_history: number[] = []
    const state_history: string[] = []

    const grades: Grade[] = [
      Rating.Good,
      Rating.Good,
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Again,
    ]
    const short_term = [true, false, false, false, true, true]

    let now = new Date(2022, 11, 29, 12, 30, 0, 0)
    let card = createEmptyCard(now)
    const f = fsrs({ w })
    for (let i = 0; i < grades.length; i++) {
      const grade = grades[i]
      const enable = short_term[i]
      f.parameters.enable_short_term = enable
      const record = f.repeat(card, now)[grade]
      // https://github.com/open-spaced-repetition/ts-fsrs/issues/105
      const next = fsrs({ ...params, enable_short_term: enable }).next(
        card,
        now,
        grade
      )
      expect(record).toEqual(next)

      card = record.card
      now = card.due
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      state_history.push(State[card.state])
    }
    expect(ivl_history).toEqual([0, 4, 1, 4, 15, 0])
    expect(s_history).toEqual([
      3.0412, 3.0412, 1.21778427, 4.32308454, 14.84659978, 2.81505627,
    ])
    expect(d_history).toEqual([
      4.49094334, 4.26664289, 5.92396593, 5.60307975, 5.3038213, 6.89123851,
    ])
    expect(state_history).toEqual([
      'Learning',
      'Review',
      'Review',
      'Review',
      'Review',
      'Relearning',
    ])
  })

  test('[Long-term]get_retrievability ', () => {
    const f = fsrs({
      w: [
        0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
        0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034,
        0.6567,
      ],
      enable_short_term: false,
    })
    const now = '2024-08-03T18:15:34.500Z'
    const view_date = '2024-08-03T18:25:34.500Z'
    let card: CardInput = createEmptyCard(now)
    card = f.repeat(card, now)[Rating.Again].card
    let r = f.get_retrievability(card, view_date)
    expect(r).toEqual('100.00%')

    card = {
      cid: 81,
      due: '2024-08-04T18:15:34.500Z',
      stability: 0.4072,
      difficulty: 7.2102,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      state: 'Review',
      last_review: '2024-08-03T18:15:34.500Z',
      nid: 82,
      suspended: false,
      deleted: false,
    } as CardInput
    r = f.get_retrievability(card, view_date)
    expect(r).toEqual('100.00%')
  })
})
