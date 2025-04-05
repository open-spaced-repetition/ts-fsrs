import {
  CLAMP_PARAMETERS,
  createEmptyCard,
  default_enable_fuzz,
  default_maximum_interval,
  default_request_retention,
  default_w,
  generatorParameters,
} from '../src/fsrs'

describe('default params', () => {
  const expected_w = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
    0.6621,
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
      0.4, 0.6, 2.4, 5.8, 6.81, 0.44675014, 1.36, 0.01, 1.49, 0.14, 0.94, 2.18,
      0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0,
    ])
  })

  it('clamp w to limit the minimum', () => {
    const w = Array.from({ length: 19 }, (_) => 0)
    const params = generatorParameters({ w })
    const w_min = CLAMP_PARAMETERS.map((x) => x[0])
    expect(params.w).toEqual(w_min)
  })

  it('clamp w to limit the maximum', () => {
    const w = Array.from({ length: 19 }, (_) => Number.MAX_VALUE)
    const params = generatorParameters({ w })
    const w_max = CLAMP_PARAMETERS.map((x) => x[1])
    expect(params.w).toEqual(w_max)
  })

  it('default w can not be overwritten', () => {
    expect(() => {
      // @ts-expect-error test modify
      default_w[4] = 0.5
    }).toThrow()
  })

  it('CLAMP_PARAMETERS can not be overwritten', () => {
    expect(() => {
      // @ts-expect-error test modify
      CLAMP_PARAMETERS[4] = [0.5, 0.5]
    }).toThrow()
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
