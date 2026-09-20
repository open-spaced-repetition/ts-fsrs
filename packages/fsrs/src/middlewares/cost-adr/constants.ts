import type { CostAdrPolicy } from './schema.js'

/** Default used by fsrs-rs examples/cost_adr.rs, ExampleConfig::default(). */
export const COST_ADR_DEFAULT_GOAL_COST_WEIGHT = 64

// fsrs-rs 710391ed7466ee279dbdcff5f9cef3713caf42d3, cost_adr.rs default_initial().
export const COST_ADR_DEFAULT_POLICY: CostAdrPolicy = Object.freeze({
  coefficients: Object.freeze([
    -0.202, 9.14, -0.0978, 0.226, -5.31, -7.44, 24.1, -0.375, 1.81, -22.9,
    -5.82, 22.3, 1.72, -1.99, -19.4,
  ]),
  costWeightMin: 0,
  costWeightMax: 1024,
  retentionMin: 0.3,
  retentionMax: 0.995,
  bounds: Object.freeze({ sMin: 0.0001, sMax: 36500, dMin: 1, dMax: 10 }),
})
