import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Grade,
  Rating,
} from '../../src/fsrs'

describe('Long-term  schduler', () => {
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
      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }

    expect(ivl_history).toEqual([3, 6, 17, 42, 95, 200, 8, 2, 3, 3, 6, 10, 17])
    expect(s_history).toEqual([
      0.57587467, 6.28341418, 16.83356103, 41.95128557, 95.07063986,
      199.53765138, 8.31519008, 1.59859456, 1.59859456, 3.49350932, 5.58821385,
      9.83641092, 16.95422162,
    ])
    expect(d_history).toEqual([
      7.1434, 7.1434, 7.1434, 7.1434, 7.1434, 7.1434, 9.00990564, 10,
      9.80746516, 9.62790717, 9.46045139, 9.30428213, 9.15863867,
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
      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }

    expect(ivl_history).toEqual([1, 2, 3, 8, 2, 2, 3, 8])

    expect(s_history).toEqual([
      0.21652154, 0.21652154, 1.32177381, 7.69767996, 1.91650418, 1.91650418,
      3.02442382, 8.45226282,
    ])
    expect(d_history).toEqual([
      9.00990564, 9.81735598, 9.63713135, 8.53580104, 10, 10, 9.80746516,
      8.69465435,
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
      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }

    expect(ivl_history).toEqual([2, 3, 17, 3, 3, 5, 15, 3])

    expect(s_history).toEqual([
      0.35311368, 3.40179546, 16.86596974, 2.9223039, 2.9223039, 4.91748183,
      15.09437624, 2.71341838,
    ])
    expect(d_history).toEqual([
      8.07665282, 8.01375158, 7.02183706, 8.89653604, 9.71162749, 9.53852896,
      8.44384445, 10,
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
      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }

    expect(ivl_history).toEqual([3, 17, 3, 3, 6, 23, 3, 3])

    expect(s_history).toEqual([
      0.57587467, 17.3937106, 2.98322161, 2.98322161, 6.06697209, 23.2008818,
      3.36166219, 3.36166219,
    ])
    expect(d_history).toEqual([
      7.1434, 6.21014718, 8.13955406, 9.0056661, 8.88014936, 7.82983963,
      9.65007924, 10,
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
      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }

    expect(ivl_history).toEqual([4, 1, 2, 3, 13, 3, 3, 4])

    expect(s_history).toEqual([
      0.93916394, 0.70772253, 0.70772253, 2.9537906, 12.61933619, 2.51177108,
      2.51177108, 4.07590188,
    ])
    expect(d_history).toEqual([
      6.21014718, 8.13955406, 9.0056661, 8.88014936, 7.82983963, 9.65007924, 10,
      9.80746516,
    ])
  })
})
