import {
  createEmptyCard,
  fsrs,
  FSRSAlgorithm,
  generatorParameters,
  Grade,
  Rating,
  State,
} from '../../src/fsrs'
import LongTermScheduler from '../../src/fsrs/impl/long_term_schduler'

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

    expect(ivl_history).toEqual([3, 6, 17, 42, 95, 200, 8, 2, 3, 5, 8, 14, 23])
    expect(s_history).toEqual([
      0.57587467, 6.28341418, 16.83356103, 41.95128557, 95.07063986,
      199.53765138, 8.31519008, 1.96276113, 3.06877302, 4.90880017, 8.15177579,
      13.50873393, 22.92901865,
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
    expect(ivl_history).toEqual([1, 2, 3, 8, 2, 2, 4, 10])

    expect(s_history).toEqual([
      0.21652154, 0.51780862, 1.8183783, 8.18593986, 1.96087115, 2.23717242,
      3.33185406, 10.31008873,
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
    expect(ivl_history).toEqual([2, 3, 17, 3, 4, 6, 18, 3])

    expect(s_history).toEqual([
      0.35311368, 3.40179546, 16.86596974, 2.9223039, 3.73601023, 6.27595217,
      18.057595, 2.96541083,
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

    expect(ivl_history).toEqual([3, 17, 3, 4, 8, 30, 4, 4])

    expect(s_history).toEqual([
      0.57587467, 17.3937106, 2.98322161, 4.08808234, 7.99405969, 29.76078201,
      3.78204811, 4.44627015,
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

    expect(ivl_history).toEqual([4, 1, 2, 3, 13, 3, 3, 5])

    expect(s_history).toEqual([
      0.93916394, 0.70772253, 1.16119435, 3.42301186, 12.97577367, 2.53486926,
      3.06202367, 4.60523893,
    ])
    expect(d_history).toEqual([
      6.21014718, 8.13955406, 9.0056661, 8.88014936, 7.82983963, 9.65007924, 10,
      9.80746516,
    ])
  })

  test('[State.(Re)Learning]switch long-term schduler', () => {
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
      card = record.card
      now = card.due
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      state_history.push(State[card.state])
    }
    expect(ivl_history).toEqual([0, 4, 1, 4, 12, 0])
    expect(s_history).toEqual([
      3.0412, 3.0412, 1.20788692, 3.83856852, 12.23542321, 2.48288917,
    ])
    expect(d_history).toEqual([4.49094334, 4.66971892, 6.70295066, 6.73263695,6.76032238,8.65264745])
    expect(state_history).toEqual(['Learning', 'Review', 'Review', 'Review','Review','Relearning'])
  })
})
