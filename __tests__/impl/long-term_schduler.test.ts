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
      4, 17, 62, 198, 563, 1449, 18, 3, 10, 29, 81, 208, 502,
    ])
    expect(s_history).toEqual([
      4.17286168, 17.33942096, 62.45493874, 198.13330729, 562.55192571,
      1449.18903735, 18.02829052, 3.10373795, 9.7718827, 29.49684743,
      80.53088743, 207.96618164, 501.92716748,
    ])
    expect(d_history).toEqual([
      4.26664289, 4.05746029, 3.86237659, 3.68044154, 3.51076891, 3.35253221,
      5.07146631, 6.67454425, 6.30306909, 5.95663136, 5.63354353, 5.33223182,
      5.05122852,
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
    expect(ivl_history).toEqual([1, 2, 3, 14, 3, 4, 8, 34])

    expect(s_history).toEqual([
      0.21652154, 0.57883165, 2.75860692, 14.17790785, 2.66869241, 3.62352774,
      7.6088889, 33.82907094,
    ])
    expect(d_history).toEqual([
      8.60682961, 9.03837124, 8.50757415, 7.07929996, 8.54704991, 8.98262069,
      8.45558118, 7.03081132,
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
    expect(ivl_history).toEqual([2, 6, 43, 5, 7, 19, 105, 7])

    expect(s_history).toEqual([
      0.99859573, 5.7417607, 42.72918658, 4.6098319, 7.12974887, 18.63253486,
      105.11617885, 6.63532196,
    ])
    expect(d_history).toEqual([
      6.82384748, 6.44230929, 5.15323395, 6.75080075, 7.30743873, 6.89330649,
      5.57383394, 7.1430523,
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
    expect(ivl_history).toEqual([4, 43, 5, 8, 27, 189, 9, 14])

    expect(s_history).toEqual([
      4.17286168, 42.96944527, 4.82999068, 8.46023115, 27.39431946,
      189.08198578, 8.5746676, 13.66776552,
    ])
    expect(d_history).toEqual([
      4.26664289, 3.12420747, 4.85853065, 5.54270763, 5.24751826, 4.03897184,
      5.71163991, 6.33831733,
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
    expect(ivl_history).toEqual([34, 5, 10, 40, 332, 11, 19, 62])

    expect(s_history).toEqual([
      34.11176785, 4.83367762, 9.63465043, 40.34289083, 331.50158605,
      11.06060994, 18.74932221, 62.03449915,
    ])
    expect(d_history).toEqual([
      1, 2.87749477, 3.69519357, 3.52452665, 2.43210986, 4.21308042, 4.94076075,
      4.6861426,
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
})
