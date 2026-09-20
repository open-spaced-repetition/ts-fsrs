import { clamp } from '@/help.js'
import type { FSRSState } from '@/kit/types.js'
import type { CostAdrPolicy } from './schema.js'

// fsrs-rs cost_adr.rs: CostAdrPolicyEvaluator, policy version 1.
export function evaluateCostAdrRetention(
  policy: CostAdrPolicy,
  memoryState: FSRSState,
  costWeight: number
): number {
  const { bounds, coefficients } = policy
  const stability = clamp(memoryState.stability, bounds.sMin, bounds.sMax)
  const difficulty = clamp(memoryState.difficulty, bounds.dMin, bounds.dMax)
  const logMin = Math.log(bounds.sMin)
  const xs = clamp(
    (Math.log(stability) - logMin) / (Math.log(bounds.sMax) - logMin),
    0,
    1
  )
  const xd = clamp(
    (difficulty - bounds.dMin) / (bounds.dMax - bounds.dMin),
    0,
    1
  )
  const weight = clamp(costWeight, policy.costWeightMin, policy.costWeightMax)
  const logWeightMin = Math.log1p(policy.costWeightMin)
  const z = clamp(
    (Math.log1p(weight) - logWeightMin) /
      (Math.log1p(policy.costWeightMax) - logWeightMin),
    0,
    1
  )
  const features = [1, xs, xd, xs * xd, xs * xs]
  const dot = (offset: number) =>
    features.reduce(
      (sum, feature, index) => sum + coefficients[offset + index] * feature,
      0
    )
  const value = dot(0) - softplus(dot(5)) * z - softplus(dot(10)) * z * z
  const exp = Math.exp(-Math.abs(value))
  const sigmoid = value >= 0 ? 1 / (1 + exp) : exp / (1 + exp)
  return clamp(
    policy.retentionMin + (policy.retentionMax - policy.retentionMin) * sigmoid,
    policy.retentionMin,
    policy.retentionMax
  )
}

function softplus(value: number): number {
  if (value > 20) return value
  if (value < -20) return Math.exp(value)
  return Math.log1p(Math.exp(value))
}
