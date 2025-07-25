// Import the Alea generator and additional required elements
import { alea } from '../src/fsrs/alea' // Adjust the import path according to your project structure

describe('Alea PRNG Tests', () => {
  it('make sure two seeded values are the same', () => {
    const prng1 = alea(1)
    const prng2 = alea(3)
    const prng3 = alea(1)

    const a = prng1.state()
    const b = prng2.state()
    const c = prng3.state()

    expect(a).toEqual(c)
    expect(a).not.toEqual(b)
  })

  it('Known values test', () => {
    const seed = 12345
    const generator = alea(seed)
    const results = Array.from({ length: 3 }, () => generator())
    expect(results).toEqual([
      0.27138191112317145, 0.19615925149992108, 0.6810678059700876,
    ])
  })

  it('should generate an int32', () => {
    const generator = alea('int32test')
    const int32 = generator.int32()
    expect(int32).toBeLessThanOrEqual(0xffffffff)
    expect(int32).toBeGreaterThanOrEqual(0)
  })

  it('Uint32 test', () => {
    const seed = 12345
    const generator = alea(seed)
    const results = Array.from({ length: 3 }, () => generator.int32())
    expect(results).toEqual([1165576433, 842497570, -1369803343])
  })

  it('should generate a double', () => {
    const generator = alea('doubletest')
    const double = generator.double()
    expect(double).toBeGreaterThanOrEqual(0)
    expect(double).toBeLessThan(1)
  })

  it('Fract53 test', () => {
    const seed = 12345
    const generator = alea(seed)
    const results = Array.from({ length: 3 }, () => generator.double())
    expect(results).toEqual([
      0.27138191116884325, 0.6810678062004586, 0.3407802057882554,
    ])
  })

  it('Import with Alea.importState()', () => {
    const prng1 = alea(Math.random())

    // generate a few numbers
    prng1()
    prng1()
    prng1()

    const e = prng1.state()

    const prng4 = alea().importState(e)
    expect(prng4.state()).toEqual(prng1.state())
    for (let i = 0; i < 10000; i++) {
      const a = prng1()
      const b = prng4()
      expect(a).toEqual(b)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(1)
      expect(b).toBeLessThan(1)
    }
  })
  it('should have reproducible state', () => {
    const generator = alea('statetest')
    const state1 = generator.state()
    const next1 = generator()
    const state2 = generator.state()
    const next2 = generator()

    expect(state1.s0).not.toEqual(state2.s0)
    expect(state1.s1).not.toEqual(state2.s1)
    expect(state1.s2).not.toEqual(state2.s2)
    expect(next1).not.toEqual(next2)
  })

  it('s2<0', () => {
    const seed = 12345
    const generator = alea(seed).importState({
      c: 0,
      s0: 0,
      s1: 0,
      s2: -0.5,
    })
    const results = generator()
    const state = generator.state()
    expect(results).toEqual(0)
    expect(state).toEqual({
      c: 0,
      s0: 0,
      s1: -0.5,
      s2: 0,
    })
  })

  it('seed 1727015666066', () => {
    const seed = '1727015666066' // constructor s0 = -0.4111432870849967 +1
    const generator = alea(seed)
    const results = generator()
    const state = generator.state()
    expect(results).toEqual(0.6320083506871015)
    expect(state).toEqual({
      c: 1828249,
      s0: 0.5888567129150033,
      s1: 0.5074866858776659,
      s2: 0.6320083506871015,
    })
  })

  it('seed Seedp5fxh9kf4r0', () => {
    const seed = 'Seedp5fxh9kf4r0' // constructor s1 = -0.3221628828905523 +1
    const generator = alea(seed)
    expect(generator.state().s1).toBeGreaterThan(0)
    const results = generator()
    const state = generator.state()
    expect(results).toEqual(0.14867847645655274)
    expect(state).toEqual({
      c: 1776946,
      s0: 0.6778371171094477,
      s1: 0.0770602801349014,
      s2: 0.14867847645655274,
    })
  })

  it('seed NegativeS2Seed', () => {
    const seed = 'NegativeS2Seed' // constructor s2 = -0.07867425470612943 +1
    const generator = alea(seed)
    const results = generator()
    const state = generator.state()
    expect(results).toEqual(0.830770346801728)
    expect(state).toEqual({
      c: 952982,
      s0: 0.25224833423271775,
      s1: 0.9213257452938706,
      s2: 0.830770346801728,
    })
  })

  it('seed where s1 === 0 to complete false branch', () => {
    const seed = 'seed-19140'
    const state = alea(seed).state()
    expect(state.s1).toBeGreaterThanOrEqual(0)
    expect(state.s1).toBeLessThan(0.05)
  })
})
