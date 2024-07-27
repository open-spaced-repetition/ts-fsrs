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

    expect(ivl_history).toEqual([
      3, 7, 21, 60, 158, 390, 11, 2, 5, 13, 33, 79, 184,
    ])
    expect(s_history).toEqual([
      0.57587467, 6.87994283, 21.35900027, 59.97135827, 158.31738168,
      390.28403347, 10.97158339, 2.35722772, 5.41695678, 13.11380293,
      32.50206204, 79.19030952, 184.25083571,
    ])
    expect(d_history).toEqual([
      6.74032397, 6.36441526, 6.0138428, 5.68689892, 5.38199106, 5.09763399,
      6.69894823, 8.19233389, 7.71855971, 7.27671791, 6.86465625, 6.48036755,
      6.1219799,
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
      card = record.card
      ivl_history.push(card.scheduled_days)
      s_history.push(card.stability)
      d_history.push(card.difficulty)
      now = card.due
    }
    expect(ivl_history).toEqual([2, 4, 26, 4, 5, 13, 67, 5])

    expect(s_history).toEqual([
      0.35311368, 3.82215283, 25.65963413, 3.62919153, 5.38579333, 12.54261943,
      66.53407633, 5.47466879,
    ])
    expect(d_history).toEqual([
      7.67357679, 7.23476684, 5.89227986, 7.44003496, 7.95021855, 7.49276295,
      6.13288703, 7.66442521,
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

    expect(ivl_history).toEqual([3, 19, 3, 5, 13, 73, 6, 8])

    expect(s_history).toEqual([
      0.57587467, 19.1514419, 3.17243454, 4.70631523, 12.88705197, 72.51830855,
      5.70211402, 8.22198803,
    ])
    expect(d_history).toEqual([
      6.74032397, 5.43116244, 7.00999686, 7.54916502, 7.11874042, 5.78407362,
      7.33912183, 7.85610697,
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

    expect(ivl_history).toEqual([4, 1, 2, 5, 30, 4, 6, 14])

    expect(s_history).toEqual([
      0.93916394, 0.71202904, 1.28884718, 4.82236231, 29.76149698, 3.87021442,
      5.53831177, 13.53596018,
    ])
    expect(d_history).toEqual([
      5.80707115, 7.36056932, 7.8761089, 7.42364829, 6.0684307, 7.60431324,
      8.10342447, 7.63564279,
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
