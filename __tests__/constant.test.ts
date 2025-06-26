import {
  CLAMP_PARAMETERS,
  default_enable_fuzz,
  default_maximum_interval,
  default_request_retention,
  default_w,
  FSRS6_DEFAULT_DECAY,
  generatorParameters,
  W17_W18_Ceiling,
} from '../src/fsrs'

describe('default params', () => {
  const expected_w = [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
    0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
    0.0912, 0.0658, 0.1542,
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

  it('clamp w to limit the minimum', () => {
    const w = Array.from({ length: 21 }, () => 0)
    const params = generatorParameters({ w })
    const w_min = CLAMP_PARAMETERS(W17_W18_Ceiling).map((x) => x[0])
    expect(params.w).toEqual(w_min)
  })

  it('clamp w to limit the maximum', () => {
    const w = Array.from({ length: 21 }, () => Number.MAX_VALUE)
    const params = generatorParameters({ w })
    const w_max = CLAMP_PARAMETERS(W17_W18_Ceiling).map((x) => x[1])
    expect(params.w).toEqual(w_max)
  })

  it('default w can not be overwritten', () => {
    expect(() => {
      // @ts-expect-error test modify
      default_w[4] = 0.5
    }).toThrow()
  })

  it('CLAMP_PARAMETERS can not be overwritten', () => {
    // biome-ignore lint/suspicious/noAssignInExpressions: test modify
    const clamp_parameters1 = (CLAMP_PARAMETERS(FSRS6_DEFAULT_DECAY)[4] = [
      0.5, 0.5,
    ])
    const clamp_parameters2 = CLAMP_PARAMETERS(FSRS6_DEFAULT_DECAY)
    expect(clamp_parameters1[4]).not.toEqual(clamp_parameters2)
  })
})
