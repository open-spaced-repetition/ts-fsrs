import {
  type CardInput,
  createEmptyCard,
  fsrs,
  type Grade,
  generatorParameters,
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
      3, 13, 48, 155, 445, 1158, 17, 3, 11, 37, 112, 307, 773,
    ])
    expect(s_history).toEqual([
      3.0412, 13.09130698, 48.15848988, 154.93732625, 445.05562739,
      1158.07779739, 16.63063166, 3.01732209, 11.42247264, 37.37521902,
      111.8752758, 306.5974569, 772.94026648,
    ])
    expect(d_history).toEqual([
      4.49094334, 4.26664289, 4.05746029, 3.86237659, 3.68044154, 3.51076891,
      4.69833071, 5.55956298, 5.26323756, 4.98688448, 4.72915759, 4.4888015,
      4.26464541,
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
    expect(ivl_history).toEqual([1, 2, 6, 41, 4, 7, 21, 133])
    expect(s_history).toEqual([
      0.4197, 1.0344317, 5.5356759, 41.0033667, 4.46605519, 6.67743292,
      20.88868155, 132.81849454,
    ])
    expect(d_history).toEqual([
      7.1434, 7.03653841, 6.64066485, 5.92312772, 6.44779861, 6.45995078,
      6.10293922, 5.36588547,
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
    expect(ivl_history).toEqual([2, 7, 54, 5, 8, 26, 171, 8])

    expect(s_history).toEqual([
      1.1869, 6.59167572, 53.76078737, 5.0853693, 8.09786749, 25.52991279,
      171.16195166, 8.11072373,
    ])
    expect(d_history).toEqual([
      6.23225985, 5.89059466, 5.14583392, 5.884097, 5.99269555, 5.667177,
      4.91430736, 5.71619151,
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
    expect(ivl_history).toEqual([3, 33, 4, 7, 26, 193, 9, 14])

    expect(s_history).toEqual([
      3.0412, 32.65484522, 4.22256838, 7.2325009, 25.52681746, 193.36618775,
      8.63899847, 14.31323867,
    ])
    expect(d_history).toEqual([
      4.49094334, 3.69538259, 4.83221448, 5.12078462, 4.85403286, 4.07165035,
      5.1050878, 5.34697075,
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
    expect(ivl_history).toEqual([15, 3, 6, 27, 240, 10, 17, 60])

    expect(s_history).toEqual([
      15.2441, 3.25621013, 6.32684549, 26.56339029, 239.70462771, 9.75621519,
      17.06035531, 59.59547542,
    ])
    expect(d_history).toEqual([
      1.16304343, 2.99573557, 3.59851762, 3.43436666, 2.60045771, 4.03816348,
      4.46259158, 4.24020203,
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

    expect(ivl_history).toEqual([0, 4, 1, 5, 19, 0])
    expect(s_history).toEqual([
      3.0412, 3.0412, 1.21778427, 4.73753014, 19.02294877, 3.20676576,
    ])
    expect(d_history).toEqual([
      4.49094334, 4.26664289, 5.24649844, 4.97127357, 4.71459886, 5.57136081,
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
      learning_steps: 0,
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
