import { parse } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import {
  type CostAdrPolicy,
  costAdrConfigSchema,
  costAdrPolicySchema,
} from './schema.js'

// fsrs-rs 710391ed7466ee279dbdcff5f9cef3713caf42d3, cost_adr.rs default_initial().
const policy: CostAdrPolicy = {
  coefficients: [
    -0.202, 9.14, -0.0978, 0.226, -5.31, -7.44, 24.1, -0.375, 1.81, -22.9,
    -5.82, 22.3, 1.72, -1.99, -19.4,
  ],
  costWeightMin: 0,
  costWeightMax: 1024,
  retentionMin: 0.3,
  retentionMax: 0.995,
  bounds: { sMin: 0.0001, sMax: 36500, dMin: 1, dMax: 10 },
}
const config = { costAdrPolicy: policy, goalCostWeight: 64 }

describe('Cost ADR schemas', () => {
  it.each([-64, 64])('accepts coefficient boundary %s', (coefficient) => {
    const coefficients = Array<number>(15).fill(coefficient)
    expect(
      parse(costAdrPolicySchema, { ...policy, coefficients }).coefficients
    ).toEqual(coefficients)
  })

  it.each([0, 0.5, 1024])('accepts goalCostWeight %s', (goalCostWeight) => {
    expect(
      parse(costAdrConfigSchema, { ...config, goalCostWeight }).goalCostWeight
    ).toBe(goalCostWeight)
  })

  it('validates and copies policy data without retaining caller-owned arrays', () => {
    const parsed = parse(costAdrConfigSchema, config)
    expect(parsed).toEqual(config)
    expect(parsed.costAdrPolicy.coefficients).not.toBe(policy.coefficients)
    expect(parsed.costAdrPolicy.bounds).not.toBe(policy.bounds)
  })

  it.each([
    null,
    { ...policy, coefficients: null },
    { ...policy, coefficients: [1] },
    { ...policy, coefficients: Array(15).fill(NaN) },
    { ...policy, coefficients: [-64.01, ...policy.coefficients.slice(1)] },
    { ...policy, coefficients: [64.01, ...policy.coefficients.slice(1)] },
    { ...policy, costWeightMin: NaN },
    { ...policy, costWeightMax: Infinity },
    { ...policy, costWeightMin: -1 },
    { ...policy, costWeightMax: 0 },
    { ...policy, costWeightMin: 1e16, costWeightMax: 1e16 + 2 },
    { ...policy, retentionMin: NaN },
    { ...policy, retentionMax: Infinity },
    { ...policy, retentionMin: 0 },
    { ...policy, retentionMax: 0.3 },
    { ...policy, retentionMax: 1 },
    { ...policy, bounds: null },
    ...['sMin', 'sMax', 'dMin', 'dMax'].map((key) => ({
      ...policy,
      bounds: { ...policy.bounds, [key]: Infinity },
    })),
    { ...policy, bounds: { ...policy.bounds, sMin: 0 } },
    { ...policy, bounds: { ...policy.bounds, sMax: 0.0001 } },
    {
      ...policy,
      bounds: { ...policy.bounds, sMin: 1e-307, sMax: 1.0000000000000001e-307 },
    },
    { ...policy, bounds: { ...policy.bounds, dMax: 1 } },
    {
      ...policy,
      bounds: {
        ...policy.bounds,
        dMin: -Number.MAX_VALUE,
        dMax: Number.MAX_VALUE,
      },
    },
  ])('rejects invalid policy %#', (input) => {
    expect(() => parse(costAdrPolicySchema, input)).toThrow('Cost ADR')
  })

  it.each([
    null,
    { ...config, goalCostWeight: NaN },
    { ...config, goalCostWeight: Infinity },
    { ...config, goalCostWeight: -1 },
    { ...config, goalCostWeight: 1024.01 },
    { ...config, costAdrPolicy: {} },
  ])('rejects invalid config %#', (input) => {
    expect(() => parse(costAdrConfigSchema, input)).toThrow()
  })
})
