import {
  checkParameters,
  CLAMP_PARAMETERS,
  clipParameters,
  createEmptyCard,
  default_w,
  fsrs,
  FSRS5_DEFAULT_DECAY,
  generatorParameters,
  W17_W18_Ceiling,
} from '../src/fsrs'

describe('default params', () => {
  it('convert FSRS-4.5 to FSRS-6', () => {
    const params = generatorParameters({
      w: [
        0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
        0.05, 0.34, 1.26, 0.29, 2.61,
      ],
    })
    expect(params.w).toEqual([
      0.4,
      0.6,
      2.4,
      5.8,
      6.81,
      0.44675014,
      1.36,
      0.01,
      1.49,
      0.14,
      0.94,
      2.18,
      0.05,
      0.34,
      1.26,
      0.29,
      2.61,
      0.0,
      0.0,
      0.0,
      FSRS5_DEFAULT_DECAY,
    ])
  })

  it('convert FSRS-5 to FSRS-6', () => {
    const params = generatorParameters({
      w: [
        0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
        1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
        0.51655, 0.6621,
      ],
    })
    expect(params.w).toEqual([
      0.40255,
      1.18385,
      3.173,
      15.69105,
      7.1949,
      0.5345,
      1.4604,
      0.0046,
      1.54575,
      0.1192,
      1.01925,
      1.9395,
      0.11,
      0.29605,
      2.2698,
      0.2315,
      2.9898,
      0.51655,
      0.6621,
      0.0,
      FSRS5_DEFAULT_DECAY,
    ])
  })

  it('revert to default params', () => {
    const params = generatorParameters({
      w: [0.40255],
    })
    expect(params.w).toEqual(default_w)

    const f = fsrs(params)
    f.parameters.w = [0]
    expect(f.parameters.w).toEqual(default_w)
  })

  it('checkParameters', () => {

    // generatorParameters does not call this function
    // ref: https://github.com/open-spaced-repetition/ts-fsrs/pull/174#discussion_r2070436201
    expect(() => generatorParameters({
      w: [0.40255]
    })).not.toThrow()

    const w = [...default_w]

    expect(() => checkParameters(w)).not.toThrow()
    expect(() => checkParameters(w.slice(0, 19))).not.toThrow()
    expect(() => checkParameters(w.slice(0, 17))).not.toThrow()
    expect(() => checkParameters([0.40255])).toThrow(/^Invalid parameter length/)
    expect(() => checkParameters(w.slice(0, 16))).toThrow(/^Invalid parameter length/)
    w[5] = Infinity
    expect(() => checkParameters(w)).toThrow(/^Non-finite/)

  })

  it('if num relearning steps > 1', () => {
    const w = [...default_w]
    w[17] = Number.MAX_VALUE
    w[18] = Number.MAX_VALUE
    const params = clipParameters(w, 2)
    expect(params[17]).toEqual(0.05801436)
    expect(params[18]).toEqual(0.05801436)
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
