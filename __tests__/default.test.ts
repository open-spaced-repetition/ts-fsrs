import {
  createEmptyCard,
  default_enable_fuzz,
  default_maximum_interval,
  default_request_retention,
  default_w,
  generatorParameters,
} from '../src/fsrs'

describe('default params', () => {
  const expected_w = [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
    0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034,
    0.6567,
  ]
  expect(default_request_retention).toEqual(0.9)
  expect(default_maximum_interval).toEqual(36500)
  expect(default_enable_fuzz).toEqual(false)
  expect(default_w.length).toBe(expected_w.length)
  expect(default_w).toEqual(expected_w)

  const params = generatorParameters()
  it('default_request_retention', () => {
    expect(params.request_retention).toEqual(default_request_retention)
  })
  it('default_maximum_interval', () => {
    expect(params.maximum_interval).toEqual(default_maximum_interval)
  })
  it('default_w ', () => {
    expect(params.w).toEqual(expected_w)
  })
  it('default_enable_fuzz ', () => {
    expect(params.enable_fuzz).toEqual(default_enable_fuzz)
  })

  it('convert FSRS 4.5 to FSRS-5', () => {
    const params = generatorParameters({
      w: [
        0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
        0.05, 0.34, 1.26, 0.29, 2.61,
      ],
    })
    expect(params.w).toEqual([
      0.4, 0.6, 2.4, 5.8, 6.81, 0.44675014, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
      0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0,
    ])
  })
})

describe('default Card', () => {
  it('empty card', () => {
    const time = [new Date(), new Date('2023-10-3 00:00:00')]
    for (const now of time) {
      const card = createEmptyCard(now)
      expect(card.due).toEqual(now)
      expect(card.stability).toEqual(0)
      expect(card.difficulty).toEqual(0)
      expect(card.elapsed_days).toEqual(0)
      expect(card.scheduled_days).toEqual(0)
      expect(card.reps).toEqual(0)
      expect(card.lapses).toEqual(0)
      expect(card.state).toEqual(0)
    }
  })
})
