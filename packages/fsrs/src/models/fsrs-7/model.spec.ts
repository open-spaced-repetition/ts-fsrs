import { type Grade, Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { FSRS7Algorithm } from './algorithm.js'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7_MODEL_BOUNDS } from './constants.js'
import { FSRS7Model } from './model.js'
import { FSRS7MemoryStateSchema, type FSRS7State } from './schema.js'

// Reference: fsrs-rs c9562d6 and srs-benchmark b4b0254, evaluated in float32.
// biome-ignore format: compact independent reference values.
const referenceHistories = [
  {"history":[{"deltaT":0,"rating":1},{"deltaT":0,"rating":3},{"deltaT":1,"rating":3},{"deltaT":3,"rating":3},{"deltaT":8,"rating":3},{"deltaT":21,"rating":3}],"states":[{"stability":0.1104,"stabilityFast":0.08832,"difficulty":6.1686},{"stability":0.11041191,"stabilityFast":0.08832,"difficulty":6.109214},{"stability":0.91686124,"stabilityFast":44.444206,"difficulty":6.0504217},{"stability":3.5337858,"stabilityFast":193.5973,"difficulty":5.9922175},{"stability":10.186002,"stabilityFast":407.62646,"difficulty":5.934595},{"stability":25.985723,"stabilityFast":700.5589,"difficulty":5.877549}],"benchmarkStates":[{"stability":0.1103999987244606,"stabilityFast":0.08832000195980072,"difficulty":6.168600082397461},{"stability":0.11041191220283508,"stabilityFast":0.08832000195980072,"difficulty":6.109213829040527},{"stability":0.9168612360954285,"stabilityFast":44.44420623779297,"difficulty":6.050421714782715},{"stability":3.533785820007324,"stabilityFast":193.59730529785156,"difficulty":5.992217540740967},{"stability":10.186001777648926,"stabilityFast":407.62646484375,"difficulty":5.934595108032227},{"stability":25.985713958740234,"stabilityFast":700.5588989257812,"difficulty":5.877549171447754}]},
  {"history":[{"deltaT":0,"rating":1},{"deltaT":0.99791664,"rating":1},{"deltaT":0.82361114,"rating":1},{"deltaT":1.0388889,"rating":1},{"deltaT":0.0013888889,"rating":3},{"deltaT":0.0020833334,"rating":3},{"deltaT":0.0020833334,"rating":3},{"deltaT":0.0027777778,"rating":3}],"states":[{"stability":0.1104,"stabilityFast":0.08832,"difficulty":6.1686},{"stability":0.06706447,"stabilityFast":0.016565936,"difficulty":8.047908},{"stability":0.04536918,"stabilityFast":0.0034119464,"difficulty":8.764432},{"stability":0.0329967,"stabilityFast":0.00074974925,"difficulty":9.098293},{"stability":0.14780034,"stabilityFast":2.8802187,"difficulty":9.009611},{"stability":0.24254547,"stabilityFast":7.019944,"difficulty":8.921815},{"stability":0.3307042,"stabilityFast":10.166433,"difficulty":8.834897},{"stability":0.4365655,"stabilityFast":13.619719,"difficulty":8.748848}],"benchmarkStates":[{"stability":0.1103999987244606,"stabilityFast":0.08832000195980072,"difficulty":6.168600082397461},{"stability":0.06706447154283524,"stabilityFast":0.01656593568623066,"difficulty":8.047908782958984},{"stability":0.04536918178200722,"stabilityFast":0.003411946352571249,"difficulty":8.764432907104492},{"stability":0.03299669921398163,"stabilityFast":0.0007497492479160428,"difficulty":9.098294258117676},{"stability":0.1478002816438675,"stabilityFast":2.8802170753479004,"difficulty":9.009612083435059},{"stability":0.24254533648490906,"stabilityFast":7.019941329956055,"difficulty":8.921815872192383},{"stability":0.3307039737701416,"stabilityFast":10.166431427001953,"difficulty":8.834897994995117},{"stability":0.4365651309490204,"stabilityFast":13.61971378326416,"difficulty":8.748848915100098}]},
  {"history":[{"deltaT":0,"rating":4},{"deltaT":0.001,"rating":2},{"deltaT":0.25,"rating":1},{"deltaT":0,"rating":3},{"deltaT":1.5,"rating":4},{"deltaT":2.75,"rating":2},{"deltaT":100.5,"rating":1}],"states":[{"stability":11.7841,"stabilityFast":9.427279,"difficulty":1},{"stability":12.22947,"stabilityFast":13.9512825,"difficulty":4.636193},{"stability":2.6588404,"stabilityFast":0.3485167,"difficulty":9.259369},{"stability":2.6589437,"stabilityFast":0.3485167,"difficulty":9.169076},{"stability":5.028668,"stabilityFast":25.826185,"difficulty":8.743264},{"stability":7.37282,"stabilityFast":65.00047,"difficulty":9.166955},{"stability":2.3163264,"stabilityFast":0.89478546,"difficulty":9.615685}],"benchmarkStates":[{"stability":11.784099578857422,"stabilityFast":9.427279472351074,"difficulty":1},{"stability":12.229470252990723,"stabilityFast":13.951282501220703,"difficulty":4.63619327545166},{"stability":2.6588404178619385,"stabilityFast":0.34851670265197754,"difficulty":9.259368896484375},{"stability":2.6589436531066895,"stabilityFast":0.34851670265197754,"difficulty":9.169075965881348},{"stability":5.02866792678833,"stabilityFast":25.82618522644043,"difficulty":8.743264198303223},{"stability":7.372819900512695,"stabilityFast":65.00047302246094,"difficulty":9.16695499420166},{"stability":2.316326379776001,"stabilityFast":0.894785463809967,"difficulty":9.61568546295166}]}
]

// biome-ignore format: compact independent reference values.
const referenceCases = [
  {"input":null,"elapsedDays":0,"retrievability":0,"next":[{"state":{"stability":0.1104,"stabilityFast":0.08832,"difficulty":6.1686},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":0.05082268},{"retention":0.9,"interval":0.000038275626},{"retention":0.99,"interval":0.0000014600521},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":0.1103999987244606,"stabilityFast":0.08832000195980072,"difficulty":6.168600082397461}},{"state":{"stability":2.2395,"stabilityFast":1.7916001,"difficulty":5.261278},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":128.5822},{"retention":0.9,"interval":0.5974598},{"retention":0.99,"interval":0.00016643705},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":2.239500045776367,"stabilityFast":1.7916001081466675,"difficulty":5.26127815246582}},{"state":{"stability":3.9221,"stabilityFast":3.13768,"difficulty":3.5307243},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":551.4476},{"retention":0.9,"interval":4.7777247},{"retention":0.99,"interval":0.0006202255},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":3.922100067138672,"stabilityFast":3.1376800537109375,"difficulty":3.530724287033081}},{"state":{"stability":11.7841,"stabilityFast":9.427279,"difficulty":1},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":4747.62},{"retention":0.9,"interval":53.869392},{"retention":0.99,"interval":0.0160555},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":11.784099578857422,"stabilityFast":9.427279472351074,"difficulty":1}}],"benchmarkRetrievability":0},
  {"input":{"stability":10,"stabilityFast":8,"difficulty":5},"elapsedDays":0,"retrievability":0.99999,"next":[{"state":{"stability":2.2577837,"stabilityFast":0.100594744,"difficulty":9.405907},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":20.48605},{"retention":0.9,"interval":0.0018849585},{"retention":0.99,"interval":0.000004721809},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":2.2577836513519287,"stabilityFast":0.10059474408626556,"difficulty":9.405906677246094}},{"state":{"stability":10.000857,"stabilityFast":8,"difficulty":6.9766846},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":684.7744},{"retention":0.9,"interval":6.4759326},{"retention":0.99,"interval":0.0018957761},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":10.00085735321045,"stabilityFast":8,"difficulty":6.9766845703125}},{"state":{"stability":10.00134,"stabilityFast":8,"difficulty":4.9522996},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":1267.4237},{"retention":0.9,"interval":12.954835},{"retention":0.99,"interval":0.0029926773},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":10.00133991241455,"stabilityFast":8,"difficulty":4.95229959487915}},{"state":{"stability":10.00134,"stabilityFast":8,"difficulty":2.927915},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":2281.588},{"retention":0.9,"interval":24.618153},{"retention":0.99,"interval":0.005193322},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":10.00133991241455,"stabilityFast":8,"difficulty":2.927915096282959}}],"benchmarkRetrievability":0.9999899864196777},
  {"input":{"stability":10,"stabilityFast":8,"difficulty":5},"elapsedDays":0.5,"retrievability":0.96410644,"next":[{"state":{"stability":2.3247545,"stabilityFast":0.32210514,"difficulty":9.260623},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":24.85494},{"retention":0.9,"interval":0.0075385687},{"retention":0.99,"interval":0.000016371883},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":2.324754476547241,"stabilityFast":0.32210513949394226,"difficulty":9.26062297821045}},{"state":{"stability":13.15481,"stabilityFast":70.479515,"difficulty":6.9766846},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":1035.9792},{"retention":0.9,"interval":11.1759},{"retention":0.99,"interval":0.022712797},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":13.154809951782227,"stabilityFast":70.4795150756836,"difficulty":6.9766845703125}},{"state":{"stability":14.930931,"stabilityFast":109.39487,"difficulty":4.9522996},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":2184.7634},{"retention":0.9,"interval":24.830954},{"retention":0.99,"interval":0.066923104},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":14.930931091308594,"stabilityFast":109.39486694335938,"difficulty":4.95229959487915}},{"state":{"stability":14.930931,"stabilityFast":118.20608,"difficulty":2.927915},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":3812.6233},{"retention":0.9,"interval":44.30529},{"retention":0.99,"interval":0.135339},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":14.930931091308594,"stabilityFast":118.2060775756836,"difficulty":2.927915096282959}}],"benchmarkRetrievability":0.9641064405441284},
  {"input":{"stability":10,"stabilityFast":8,"difficulty":5},"elapsedDays":21,"retrievability":0.8774615,"next":[{"state":{"stability":2.4947672,"stabilityFast":0.4401131,"difficulty":8.909818},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":33.78813},{"retention":0.9,"interval":0.018415969},{"retention":0.99,"interval":0.000024697547},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":2.494767189025879,"stabilityFast":0.4401130974292755,"difficulty":8.909817695617676}},{"state":{"stability":21.447685,"stabilityFast":133.01303,"difficulty":6.9766846},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":1928.8544},{"retention":0.9,"interval":21.950428},{"retention":0.99,"interval":0.07205106},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":21.44768524169922,"stabilityFast":133.01303100585938,"difficulty":6.9766845703125}},{"state":{"stability":27.8926,"stabilityFast":210.87737,"difficulty":4.9522996},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":4599.419},{"retention":0.9,"interval":54.32485},{"retention":0.99,"interval":0.2915443},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":27.89259910583496,"stabilityFast":210.8773651123047,"difficulty":4.95229959487915}},{"state":{"stability":27.8926,"stabilityFast":228.5074,"difficulty":2.927915},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":7835.2026},{"retention":0.9,"interval":93.77022},{"retention":0.99,"interval":0.6741429},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":27.89259910583496,"stabilityFast":228.5074005126953,"difficulty":2.927915096282959}}],"benchmarkRetrievability":0.8774614930152893},
  {"input":{"stability":0.0001,"stabilityFast":0.0001,"difficulty":10},"elapsedDays":0.000011574074,"retrievability":0.34352458,"next":[{"state":{"stability":0.0001,"stabilityFast":0.0001,"difficulty":9.9023},"intervals":[{"retention":0.1,"interval":0.05710887},{"retention":0.65,"interval":1.373549e-7},{"retention":0.9,"interval":8.1039175e-9},{"retention":0.99,"interval":5.47304e-10},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":0.00009999999747378752,"stabilityFast":0.00009999999747378752,"difficulty":9.902299880981445}},{"state":{"stability":0.0002527925,"stabilityFast":0.30059442,"difficulty":9.9023},"intervals":[{"retention":0.1,"interval":125.090706},{"retention":0.65,"interval":0.00052409014},{"retention":0.9,"interval":0.000033155135},{"retention":0.99,"interval":0.0000022697163},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":0.00025279249530285597,"stabilityFast":0.3005944490432739,"difficulty":9.902299880981445}},{"state":{"stability":0.0003388129,"stabilityFast":0.48775733,"difficulty":9.9023},"intervals":[{"retention":0.1,"interval":211.37048},{"retention":0.65,"interval":0.00086739927},{"retention":0.9,"interval":0.000054908778},{"retention":0.99,"interval":0.0000037600585},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":0.0003388129116501659,"stabilityFast":0.4877573549747467,"difficulty":9.902299880981445}},{"state":{"stability":0.0003388129,"stabilityFast":0.53013474,"difficulty":9.9023},"intervals":[{"retention":0.1,"interval":228.3057},{"retention":0.65,"interval":0.00094360433},{"retention":0.9,"interval":0.000059806927},{"retention":0.99,"interval":0.0000040970463},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":0.0003388129116501659,"stabilityFast":0.5301347970962524,"difficulty":9.902299880981445}}],"benchmarkRetrievability":0.3435245752334595},
  {"input":{"stability":36500,"stabilityFast":0.01,"difficulty":1},"elapsedDays":36500,"retrievability":0.973712,"next":[{"state":{"stability":390.85403,"stabilityFast":0.0025306938,"difficulty":8.817285},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":30587.924},{"retention":0.9,"interval":367.7285},{"retention":0.99,"interval":0.50528693},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":390.8540344238281,"stabilityFast":0.0025306937750428915,"difficulty":8.81728458404541}},{"state":{"stability":36500,"stabilityFast":48.136513,"difficulty":4.636193},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":36500},{"retention":0.9,"interval":36500},{"retention":0.99,"interval":5114.481},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":36500,"stabilityFast":48.136512756347656,"difficulty":4.63619327545166}},{"state":{"stability":36500,"stabilityFast":78.11211,"difficulty":1},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":36500},{"retention":0.9,"interval":36500},{"retention":0.99,"interval":12157.432},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":36500,"stabilityFast":78.11210632324219,"difficulty":1}},{"state":{"stability":36500,"stabilityFast":84.89918,"difficulty":1},"intervals":[{"retention":0.1,"interval":36500},{"retention":0.65,"interval":36500},{"retention":0.9,"interval":36500},{"retention":0.99,"interval":12158.069},{"retention":0.9999,"interval":0}],"benchmarkState":{"stability":36500,"stabilityFast":84.89917755126953,"difficulty":1}}],"benchmarkRetrievability":0.9737120270729065}
]

const model = FSRS7Model.create({
  config: { weights: FSRS7_DEFAULT_WEIGHTS },
})

// Both independent references use float32; JS evaluates the formulas in float64.
function expectState(actual: FSRS7State, expected: FSRS7State) {
  for (const key of ['stability', 'stabilityFast', 'difficulty'] as const) {
    expect(
      Math.abs(actual[key] - expected[key]),
      `${key}: ${actual[key]} vs ${expected[key]}`
    ).toBeLessThanOrEqual(Math.max(1e-7, Math.abs(expected[key]) * 1e-4))
  }
}

describe('FSRS7Model reference parity', () => {
  it('exposes the default configuration and algorithm', () => {
    expect(model.config.weights).toEqual(FSRS7_DEFAULT_WEIGHTS)
    expect(model.algorithm).toBeInstanceOf(FSRS7Algorithm)
  })

  it.each(
    referenceHistories
  )('replays every memory state in a $history.length-review history', ({
    history,
    states,
    benchmarkStates,
  }) => {
    const reviews = history.map(({ deltaT, rating }) => ({
      deltaT,
      rating: rating as Grade,
    }))
    const actual = model.forward({ history: reviews })
    expect(actual).toHaveLength(states.length)
    actual.forEach((state, i) => {
      expectState(state, states[i])
      expectState(state, benchmarkStates[i])
    })
    const split = Math.floor(reviews.length / 2)
    expect(
      model.forward({
        history: reviews.slice(split),
        initialState: actual[split - 1],
      })
    ).toEqual(actual.slice(split))
  })

  it.each(
    referenceCases
  )('matches all four grades at elapsedDays=$elapsedDays from $input', (test) => {
    if (test.input) {
      expect(model.forgettingCurve(test.input, test.elapsedDays)).toBeCloseTo(
        test.retrievability,
        5
      )
      expect(model.forgettingCurve(test.input, test.elapsedDays)).toBeCloseTo(
        test.benchmarkRetrievability,
        5
      )
    }
    for (const [index, expected] of test.next.entries()) {
      const actual = model.step({
        memoryState: test.input,
        elapsedDays: test.elapsedDays,
        rating: (index + 1) as Grade,
      })
      expectState(actual, expected.state)
      expectState(actual, expected.benchmarkState)
      for (const { retention, interval } of expected.intervals) {
        // Use the reference state to isolate interval inversion from recurrence drift.
        const result = model.nextInterval(expected.state, retention)
        expect(
          Math.abs(result - interval),
          `interval at ${retention}: ${result} vs ${interval}`
        ).toBeLessThanOrEqual(Math.max(1e-8, interval * 2e-3))
      }
    }
  })

  it('has distinct fast and slow traces and does not round fractional elapsed days', () => {
    const state = { stability: 10, stabilityFast: 8, difficulty: 5 }
    const step = (elapsedDays: number) =>
      model.step({ memoryState: state, elapsedDays, rating: Rating.Good })
    expect(step(0.5)).not.toEqual(step(0))
    expect(step(0.5)).not.toEqual(step(1))
    expect(
      model.forgettingCurve({ ...state, stabilityFast: 0.01 }, 0.5)
    ).not.toBe(model.forgettingCurve(state, 0.5))
    expect(model.forgettingCurve(state, 0)).toBeCloseTo(0.99999, 10)
  })

  it('keeps a repeated lapse under two minutes but gives the following Good over two hours at 65% retention', () => {
    const { history } = referenceHistories[1]
    const states = model.forward({
      history: history.map(({ rating, deltaT }) => ({
        rating: rating as Grade,
        deltaT,
      })),
    })
    const again = model.nextInterval(states[3], 0.65) * 1440
    expect(again).toBeGreaterThan(0)
    expect(again).toBeLessThan(2)
    expect(model.nextInterval(states[4], 0.65) * 1440).toBeGreaterThan(120)
  })

  it('does not treat w20 as a forgetting-curve decay parameter', () => {
    const config = { weights: [...FSRS7_DEFAULT_WEIGHTS] }
    config.weights[20] = 0.001
    const a = FSRS7Model.create({ config })
    config.weights[20] = 5
    const b = FSRS7Model.create({ config })
    const state = { stability: 12, stabilityFast: 9.6, difficulty: 5 }
    expect(a.forgettingCurve(state, 10)).toBe(b.forgettingCurve(state, 10))
  })

  it('uses cached mixed retrievability only for slow stability and difficulty', () => {
    const state = { stability: 10, stabilityFast: 8, difficulty: 5 }
    const input = {
      memoryState: state,
      elapsedDays: 0.5,
      rating: Rating.Again,
    } as const
    const normal = model.step(input)
    expect(
      model.step({
        ...input,
        retrievability: model.forgettingCurve(state, 0.5),
      })
    ).toEqual(normal)
    expect(
      model.step({ ...input, retrievability: 0.1 }).difficulty
    ).toBeLessThan(normal.difficulty)
  })

  it('inverts the curve for high retention, including subsecond and saturated intervals', () => {
    for (const stability of [0.0001, 0.01, 1, 100, 36500]) {
      for (const retention of [0.1, 0.65, 0.9, 0.99, 0.9998]) {
        const state = {
          stability,
          stabilityFast: stability * 0.8,
          difficulty: 5,
        }
        const interval = model.nextInterval(state, retention)
        expect(interval).toBeGreaterThanOrEqual(0)
        expect(interval).toBeLessThanOrEqual(36500)
        if (interval < 36499.99) {
          expect(
            Math.abs(model.forgettingCurve(state, interval) - retention)
          ).toBeLessThanOrEqual(1e-3)
        }
      }
    }
    expect(
      model.nextInterval(
        { stability: 1, stabilityFast: 0.8, difficulty: 5 },
        1 - Number.EPSILON
      )
    ).toBe(0)
  })
})

describe('FSRS7Model validation and create controls', () => {
  it('requires supplied retrievability to be strictly between zero and one', () => {
    const input = {
      memoryState: { stability: 10, stabilityFast: 8, difficulty: 5 },
      elapsedDays: 1,
      rating: Rating.Good,
    } as const
    for (const retrievability of [0, 1, -0.1, 1.1, NaN, Infinity, -Infinity]) {
      expect(() => model.step({ ...input, retrievability })).toThrow(
        'Retrievability should be in the range (0,1)'
      )
    }
    for (const retrievability of [Number.MIN_VALUE, 0.5, 1 - Number.EPSILON]) {
      expect(() => model.step({ ...input, retrievability })).not.toThrow()
    }
    expect(model.step(input)).toEqual(
      model.step({
        ...input,
        retrievability: model.forgettingCurve(
          input.memoryState,
          input.elapsedDays
        ),
      })
    )
  })
  it('supports defaults, empty histories, and manual no-op without mutating inputs', () => {
    const initial = FSRS7Model.defaultValue.memoryState({
      config: { weights: [] },
    })
    expect(initial).toEqual({ stability: 0, stabilityFast: 0, difficulty: 0 })
    expect(model.forward({ history: [] })).toEqual([])
    expect(model.algorithm.next_state(initial, 0, Rating.Manual)).toEqual(
      initial
    )
    expect(model.algorithm.next_state(null, 0, Rating.Manual)).toEqual(initial)
    const frozen = Object.freeze({
      stability: 10,
      stabilityFast: 8,
      difficulty: 5,
    })
    model.step({ memoryState: frozen, elapsedDays: 0.1, rating: Rating.Again })
    expect(frozen).toEqual({ stability: 10, stabilityFast: 8, difficulty: 5 })
  })

  it('keeps migrate, clip, check, and bypass independent', () => {
    expect(
      FSRS7Model.create({ config: { weights: [] } }).config.weights
    ).toEqual(FSRS7_DEFAULT_WEIGHTS)
    const config = { weights: [...FSRS7_DEFAULT_WEIGHTS] }
    config.weights[0] = 0
    expect(() => FSRS7Model.create({ config, clip: false })).toThrow(
      'Expected FSRS7 weights'
    )
    expect(
      FSRS7Model.create({ config, migrate: false }).config.weights[0]
    ).toBe(0.0001)
    expect(
      FSRS7Model.create({ config, clip: false, check: false }).config.weights[0]
    ).toBe(0)
    expect(FSRS7Model.create({ config, bypass: true }).config).toBe(config)
    expect(() =>
      FSRS7Model.create({ config: { weights: [] }, migrate: false })
    ).toThrow()
    expect(() =>
      FSRS7Model.create({ config: { weights: 'bad' } as never })
    ).toThrow()
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    0,
    -1,
    1,
    1.01,
  ])('rejects invalid retention %s', (retention) => {
    expect(() =>
      model.nextInterval(
        { stability: 1, stabilityFast: 1, difficulty: 5 },
        retention
      )
    ).toThrow('Desired retention rate should be in the range (0,1)')
  })

  it('rejects missing or non-finite fast stability rather than dropping it', () => {
    for (const state of [
      { stability: 1, difficulty: 5 },
      { stability: 1, stabilityFast: Number.NaN, difficulty: 5 },
    ]) {
      expect(() => FSRS7MemoryStateSchema.parse(state)).toThrow()
    }
    expect(() =>
      model.step({
        memoryState: { stability: 1, stabilityFast: 0, difficulty: 5 },
        elapsedDays: 0,
        rating: Rating.Good,
      })
    ).toThrow()
    for (const grade of [-1, 1.5, 5, Number.NaN]) {
      expect(() => model.algorithm.next_state(null, 0, grade)).toThrow()
    }
    expect(() => new FSRS7Algorithm([], FSRS7_MODEL_BOUNDS)).toThrow()
  })
})
