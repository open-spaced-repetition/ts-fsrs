import {
  computeDecayFactor,
  default_w,
  FSRS5_DEFAULT_DECAY,
  FSRS6_DEFAULT_DECAY,
  FSRSAlgorithm,
  forgetting_curve,
  fsrs,
  generatorParameters,
} from 'ts-fsrs'

describe('forgetting_curve cache consistency', () => {
  const defaultParams = generatorParameters()

  describe('instance method matches standalone function after construction', () => {
    const algorithm = new FSRSAlgorithm(defaultParams)
    const testCases = [
      { t: 0, s: 1.0 },
      { t: 1, s: 1.2931 },
      { t: 5, s: 30.0 },
      { t: 30, s: 180.0 },
      { t: 90, s: 365.0 },
    ]

    it.each(testCases)('forgetting_curve(t=$t, s=$s)', ({ t, s }) => {
      const instanceResult = algorithm.forgetting_curve(t, s)
      const standaloneResult = forgetting_curve(default_w, t, s)
      expect(instanceResult).toBe(standaloneResult)
    })
  })

  describe('cache updates correctly when w changes via parameters setter', () => {
    it('FSRSAlgorithm.parameters = { w: new_w }', () => {
      const algorithm = new FSRSAlgorithm(defaultParams)
      const before = algorithm.forgetting_curve(5, 30.0)

      // Change w[20] to FSRS5 decay (0.5)
      const new_w = [...default_w]
      new_w[20] = FSRS5_DEFAULT_DECAY
      algorithm.parameters = { w: new_w }

      const after = algorithm.forgetting_curve(5, 30.0)
      const expected = forgetting_curve(FSRS5_DEFAULT_DECAY, 5, 30.0)

      expect(after).not.toBe(before)
      expect(after).toBe(expected)
    })

    it('FSRSAlgorithm.parameters.w = new_w', () => {
      const algorithm = new FSRSAlgorithm(defaultParams)
      const before = algorithm.forgetting_curve(5, 30.0)

      const new_w = [...default_w]
      new_w[20] = FSRS5_DEFAULT_DECAY
      algorithm.parameters.w = new_w

      const after = algorithm.forgetting_curve(5, 30.0)
      const expected = forgetting_curve(FSRS5_DEFAULT_DECAY, 5, 30.0)

      expect(after).not.toBe(before)
      expect(after).toBe(expected)
    })

    it('fsrs instance: parameters = { w: new_w }', () => {
      const f = fsrs({})
      const before = f.forgetting_curve(5, 30.0)

      const new_w = [...default_w]
      new_w[20] = FSRS5_DEFAULT_DECAY
      f.parameters = { w: new_w }

      const after = f.forgetting_curve(5, 30.0)
      const expected = forgetting_curve(FSRS5_DEFAULT_DECAY, 5, 30.0)

      expect(after).not.toBe(before)
      expect(after).toBe(expected)
    })

    it('fsrs instance: parameters.w = new_w', () => {
      const f = fsrs({})
      const before = f.forgetting_curve(10, 31.722975)

      const new_w = [...default_w]
      new_w[20] = FSRS5_DEFAULT_DECAY
      f.parameters.w = new_w

      const after = f.forgetting_curve(10, 31.722975)
      const expected = forgetting_curve(FSRS5_DEFAULT_DECAY, 10, 31.722975)

      expect(after).not.toBe(before)
      expect(after).toBe(expected)
    })
  })

  describe('cache updates on in-place w element mutation', () => {
    it('fsrs: parameters.w[20] = newValue', () => {
      const f = fsrs({})
      const before = f.forgetting_curve(5, 30.0)

      ;(f.parameters.w as number[])[20] = FSRS5_DEFAULT_DECAY
      const after = f.forgetting_curve(5, 30.0)
      const expected = forgetting_curve(FSRS5_DEFAULT_DECAY, 5, 30.0)

      expect(after).not.toBe(before)
      expect(after).toBe(expected)
    })

    it('FSRSAlgorithm: parameters.w[20] = newValue', () => {
      const algo = new FSRSAlgorithm({})
      const before = algo.forgetting_curve(5, 30.0)

      ;(algo.parameters.w as number[])[20] = FSRS5_DEFAULT_DECAY
      const after = algo.forgetting_curve(5, 30.0)
      const expected = forgetting_curve(FSRS5_DEFAULT_DECAY, 5, 30.0)

      expect(after).not.toBe(before)
      expect(after).toBe(expected)
    })

    it('non-numeric property on w does not trigger cache update', () => {
      const f = fsrs({})
      const before = f.forgetting_curve(5, 30.0)

      // Pushing an extra element triggers 'set' with numeric index AND 'length',
      // but only the numeric index should call updateDecayFactor.
      // Here we verify that after push + restoring length, the cache stays correct.
      const w = f.parameters.w as number[]
      const originalLength = w.length
      w.push(0)
      w.length = originalLength
      // decay value (w[20]) was not changed, so forgetting_curve should return the same
      expect(f.forgetting_curve(5, 30.0)).toBe(before)
    })

    it('in-place then full assignment round-trip', () => {
      const f = fsrs({})
      const original = f.forgetting_curve(5, 30.0)

      // In-place mutation
      ;(f.parameters.w as number[])[20] = FSRS5_DEFAULT_DECAY
      expect(f.forgetting_curve(5, 30.0)).not.toBe(original)

      // Full assignment back to default
      f.parameters.w = default_w
      expect(f.forgetting_curve(5, 30.0)).toBe(original)
    })
  })

  describe('cache resets correctly when w reverts to default', () => {
    it('round-trip: default -> custom -> default', () => {
      const f = fsrs({})
      const original = f.forgetting_curve(5, 30.0)

      // Change to custom
      const new_w = [...default_w]
      new_w[20] = FSRS5_DEFAULT_DECAY
      f.parameters.w = new_w
      expect(f.forgetting_curve(5, 30.0)).not.toBe(original)

      // Revert to default
      f.parameters.w = default_w
      expect(f.forgetting_curve(5, 30.0)).toBe(original)
    })
  })

  describe('multiple instances with different w are independent', () => {
    it('two FSRSAlgorithm instances do not interfere', () => {
      const a = new FSRSAlgorithm({ w: default_w })

      const custom_w = [...default_w]
      custom_w[20] = FSRS5_DEFAULT_DECAY
      const b = new FSRSAlgorithm({ w: custom_w })

      const resultA = a.forgetting_curve(5, 30.0)
      const resultB = b.forgetting_curve(5, 30.0)

      expect(resultA).not.toBe(resultB)
      expect(resultA).toBe(forgetting_curve(FSRS6_DEFAULT_DECAY, 5, 30.0))
      expect(resultB).toBe(forgetting_curve(FSRS5_DEFAULT_DECAY, 5, 30.0))
    })

    it('interleaved calls remain correct', () => {
      const a = fsrs({})
      const custom_w = [...default_w]
      custom_w[20] = FSRS5_DEFAULT_DECAY
      const b = fsrs({ w: custom_w })

      for (let t = 1; t <= 10; t++) {
        const ra = a.forgetting_curve(t, 30.0)
        const rb = b.forgetting_curve(t, 30.0)
        expect(ra).toBe(forgetting_curve(default_w, t, 30.0))
        expect(rb).toBe(forgetting_curve(FSRS5_DEFAULT_DECAY, t, 30.0))
        expect(ra).not.toBe(rb)
      }
    })
  })

  describe('concurrent w mutations across instances', () => {
    it('Promise.all: multiple instances update w simultaneously', async () => {
      const decays = [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
      const instances = decays.map((decay) => {
        const w = [...default_w]
        w[20] = decay
        return fsrs({ w })
      })

      const results = await Promise.all(
        instances.map(async (f, i) => {
          // Yield to event loop to interleave execution
          await Promise.resolve()
          const r = f.forgetting_curve(5, 30.0)
          const expected = forgetting_curve(decays[i], 5, 30.0)
          return { actual: r, expected, decay: decays[i] }
        })
      )

      for (const { actual, expected } of results) {
        expect(actual).toBe(expected)
      }
    })

    it('Promise.all: w changes during concurrent reads', async () => {
      const f = fsrs({})

      const tasks = Array.from({ length: 20 }, async (_, i) => {
        await Promise.resolve()
        if (i === 10) {
          // Mid-way through, change w
          const new_w = [...default_w]
          new_w[20] = FSRS5_DEFAULT_DECAY
          f.parameters.w = new_w
        }
        // After mutation, result must match current w state
        const r = f.forgetting_curve(5, 30.0)
        const currentDecay = f.parameters.w[20]
        const expected = forgetting_curve(currentDecay, 5, 30.0)
        return { actual: r, expected }
      })

      const results = await Promise.all(tasks)
      for (const { actual, expected } of results) {
        expect(actual).toBe(expected)
      }
    })

    it('rapid sequential w mutations stay consistent', () => {
      const f = fsrs({})
      const decays = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

      for (const decay of decays) {
        const new_w = [...default_w]
        new_w[20] = decay
        f.parameters.w = new_w

        const result = f.forgetting_curve(5, 30.0)
        const expected = forgetting_curve(decay, 5, 30.0)
        expect(result).toBe(expected)
      }
    })

    it('interleaved w mutations on two instances', () => {
      const a = fsrs({})
      const b = fsrs({})

      const decaysA = [0.15, 0.3, 0.5, 0.7]
      const decaysB = [0.2, 0.4, 0.6, 0.8]

      for (let i = 0; i < decaysA.length; i++) {
        const wA = [...default_w]
        wA[20] = decaysA[i]
        a.parameters.w = wA

        const wB = [...default_w]
        wB[20] = decaysB[i]
        b.parameters.w = wB

        // Each instance must reflect its own w, not the other's
        expect(a.forgetting_curve(5, 30.0)).toBe(
          forgetting_curve(decaysA[i], 5, 30.0)
        )
        expect(b.forgetting_curve(5, 30.0)).toBe(
          forgetting_curve(decaysB[i], 5, 30.0)
        )
      }
    })
  })

  describe('computeDecayFactor consistency', () => {
    it('instance cache matches computeDecayFactor output', () => {
      const algorithm = new FSRSAlgorithm(defaultParams)
      const { decay, factor } = computeDecayFactor(default_w)

      // Verify via forgetting_curve formula: R = (1 + factor * t / s) ^ -decay
      const t = 5
      const s = 30.0
      const expected = +Math.pow(1 + (factor * t) / s, -decay).toFixed(8)
      // roundTo(x, 8) may differ slightly from toFixed(8), so use toBeCloseTo
      expect(algorithm.forgetting_curve(t, s)).toBeCloseTo(expected, 8)
    })

    it('after w change, cache matches new computeDecayFactor', () => {
      const algorithm = new FSRSAlgorithm(defaultParams)

      const new_w = [...default_w]
      new_w[20] = 0.3
      algorithm.parameters.w = new_w

      const { decay, factor } = computeDecayFactor(new_w)
      const t = 10
      const s = 50.0
      const expected = +Math.pow(1 + (factor * t) / s, -decay).toFixed(8)
      expect(algorithm.forgetting_curve(t, s)).toBeCloseTo(expected, 8)
    })
  })
})
