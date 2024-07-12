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
    0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477, 1.0007, 0.0674, 1.6597,
    0.1712, 1.1178, 2.0225, 0.0904, 0.3025, 2.1214, 0.2498, 2.9466, 0.4891,
    0.6468,
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
