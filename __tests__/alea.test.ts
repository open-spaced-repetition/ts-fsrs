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
})
