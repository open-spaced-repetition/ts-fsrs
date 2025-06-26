import {
  date_diff,
  date_scheduler,
  formatDate,
  Grades,
  get_fuzz_range,
  Rating,
  State,
  TypeConvert,
} from '../src/fsrs'

test('FSRS-Grades', () => {
  expect(Grades).toStrictEqual([
    Rating.Again,
    Rating.Hard,
    Rating.Good,
    Rating.Easy,
  ])
})

test('Date.prototype.format', () => {
  const now = new Date(2022, 11, 30, 12, 30, 0, 0)
  expect(formatDate(now)).toEqual('2022-12-30 12:30:00')
  expect(formatDate(now.getTime())).toEqual('2022-12-30 12:30:00')
  expect(formatDate(now.toUTCString())).toEqual('2022-12-30 12:30:00')
})

describe('date_scheduler', () => {
  test('offset by minutes', () => {
    const now = new Date('2023-01-01T12:00:00Z')
    const t = 30
    const expected = new Date('2023-01-01T12:30:00Z')

    expect(date_scheduler(now, t)).toEqual(expected)
  })

  test('offset by days', () => {
    const now = new Date('2023-01-01T12:00:00Z')
    const t = 3
    const expected = new Date('2023-01-04T12:00:00Z')

    expect(date_scheduler(now, t, true)).toEqual(expected)
  })

  test('negative offset', () => {
    const now = new Date('2023-01-01T12:00:00Z')
    const t = -15
    const expected = new Date('2023-01-01T11:45:00Z')

    expect(date_scheduler(now, t)).toEqual(expected)
  })

  test('offset with isDay parameter', () => {
    const now = new Date('2023-01-01T12:00:00Z')
    const t = 2
    const expected = new Date('2023-01-03T12:00:00Z')

    expect(date_scheduler(now, t, true)).toEqual(expected)
  })

  test('Date data real type is string/number', () => {
    const now = '2023-01-01T12:00:00Z'
    const t = 2
    const expected = new Date('2023-01-03T12:00:00Z')

    expect(date_scheduler(now, t, true)).toEqual(expected)
  })
})

describe('date_diff', () => {
  test('wrong fix', () => {
    const now = new Date(2022, 11, 30, 12, 30, 0, 0)
    const last_review = new Date(2022, 11, 29, 12, 30, 0, 0)

    expect(() => date_diff(now, null as unknown as Date, 'days')).toThrow(
      'Invalid date'
    )
    expect(() => date_diff(now, null as unknown as Date, 'minutes')).toThrow(
      'Invalid date'
    )
    expect(() =>
      date_diff(null as unknown as Date, last_review, 'days')
    ).toThrow('Invalid date')
    expect(() =>
      date_diff(null as unknown as Date, last_review, 'minutes')
    ).toThrow('Invalid date')
  })

  test('calculate difference in minutes', () => {
    const now = new Date('2023-11-25T12:30:00Z')
    const pre = new Date('2023-11-25T12:00:00Z')
    const unit = 'minutes'
    const expected = 30
    expect(date_diff(now, pre, unit)).toBe(expected)
  })

  test('calculate difference in minutes for negative time difference', () => {
    const now = new Date('2023-11-25T12:00:00Z')
    const pre = new Date('2023-11-25T12:30:00Z')
    const unit = 'minutes'
    const expected = -30
    expect(date_diff(now, pre, unit)).toBe(expected)
  })

  test('Date data real type is string/number', () => {
    const now = '2023-11-25T12:30:00Z'
    const pre = new Date('2023-11-25T12:00:00Z').getTime()
    const unit = 'minutes'
    const expected = 30
    expect(date_diff(now, pre, unit)).toBe(expected)
  })
})

describe('TypeConvert.time', () => {
  test('throw error for invalid date value', () => {
    const input = 'invalid-date'
    expect(() => TypeConvert.time(input)).toThrow('Invalid date:[invalid-date]')
  })

  test('throw error for unsupported value type', () => {
    const input = true
    expect(() => TypeConvert.time(input)).toThrow('Invalid date:[true]')
  })

  test('throw error for undefined value', () => {
    const input = undefined
    expect(() => TypeConvert.time(input)).toThrow('Invalid date:[undefined]')
  })

  test('throw error for null value', () => {
    const input = null
    expect(() => TypeConvert.time(input)).toThrow('Invalid date:[null]')
  })
})

describe('TypeConvert.state', () => {
  test('fix state value', () => {
    const newState = 'New'
    expect(TypeConvert.state('new')).toEqual(State.New)
    expect(TypeConvert.state(newState)).toEqual(State.New)

    const learning = 'Learning'
    expect(TypeConvert.state('learning')).toEqual(State.Learning)
    expect(TypeConvert.state(learning)).toEqual(State.Learning)

    const relearning = 'Relearning'
    expect(TypeConvert.state('relearning')).toEqual(State.Relearning)
    expect(TypeConvert.state(relearning)).toEqual(State.Relearning)

    const review = 'Review'
    expect(TypeConvert.state('review')).toEqual(State.Review)
    expect(TypeConvert.state(review)).toEqual(State.Review)
  })

  test('throw error for invalid state value', () => {
    const input = 'invalid-state'
    expect(() => TypeConvert.state(input)).toThrow(
      'Invalid state:[invalid-state]'
    )
    expect(() => TypeConvert.state(null)).toThrow('Invalid state:[null]')
    expect(() => TypeConvert.state(undefined)).toThrow(
      'Invalid state:[undefined]'
    )
  })
})

describe('TypeConvert.rating', () => {
  test('fix Rating value', () => {
    const again = 'Again'
    expect(TypeConvert.rating('again')).toEqual(Rating.Again)
    expect(TypeConvert.rating(again)).toEqual(Rating.Again)

    const hard = 'Hard'
    expect(TypeConvert.rating('hard')).toEqual(Rating.Hard)
    expect(TypeConvert.rating(hard)).toEqual(Rating.Hard)

    const good = 'Good'
    expect(TypeConvert.rating('good')).toEqual(Rating.Good)
    expect(TypeConvert.rating(good)).toEqual(Rating.Good)

    const easy = 'Easy'
    expect(TypeConvert.rating('easy')).toEqual(Rating.Easy)
    expect(TypeConvert.rating(easy)).toEqual(Rating.Easy)
  })

  test('throw error for invalid rating value', () => {
    const input = 'invalid-rating'
    expect(() => TypeConvert.rating(input)).toThrow(
      'Invalid rating:[invalid-rating]'
    )
    expect(() => TypeConvert.rating(null)).toThrow('Invalid rating:[null]')
    expect(() => TypeConvert.rating(undefined)).toThrow(
      'Invalid rating:[undefined]'
    )
  })
})

describe('default values can not be overwritten', () => {
  it('Grades can not be overwritten', () => {
    expect(() => {
      // @ts-expect-error test modify
      Grades[4] = Rating.Manual
    }).toThrow()
    expect(Grades.length).toEqual(4)
  })
})

it('get_fuzz_range should skip interval > elapsed_days branch when interval <= elapsed_days', () => {
  const result = get_fuzz_range(5, 5, 100)
  expect(result.min_ivl).toBeLessThanOrEqual(result.max_ivl)
})
