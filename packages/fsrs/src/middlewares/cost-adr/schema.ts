import {
  defineSchema,
  isFiniteNumber,
  isObject,
} from '@open-spaced-repetition/srs-kit'
import { isNumberArray } from '@/kit/schema-utils.js'

/** Retention parameters from fsrs-rs CostAdrPolicy, in camel case. */
export type CostAdrPolicy = {
  /** Exactly 15 finite coefficients, each in [-64, 64]. */
  readonly coefficients: readonly number[]
  readonly costWeightMin: number
  readonly costWeightMax: number
  readonly retentionMin: number
  readonly retentionMax: number
  readonly bounds: {
    readonly sMin: number
    readonly sMax: number
    readonly dMin: number
    readonly dMax: number
  }
}

export const costAdrPolicySchema = defineSchema<CostAdrPolicy>((value) => {
  if (
    !isObject(value) ||
    !isNumberArray(value.coefficients) ||
    value.coefficients.length !== 15 ||
    value.coefficients.some(
      (coefficient) => coefficient < -64 || coefficient > 64
    ) ||
    !isFiniteNumber(value.costWeightMin) ||
    !isFiniteNumber(value.costWeightMax) ||
    value.costWeightMin < 0 ||
    value.costWeightMax <= value.costWeightMin ||
    Math.log1p(value.costWeightMax) <= Math.log1p(value.costWeightMin) ||
    !isFiniteNumber(value.retentionMin) ||
    !isFiniteNumber(value.retentionMax) ||
    value.retentionMin <= 0 ||
    value.retentionMax <= value.retentionMin ||
    value.retentionMax >= 1
  ) {
    return { issues: [{ message: 'Expected valid Cost ADR policy' }] }
  }

  const { bounds } = value
  if (
    !isObject(bounds) ||
    !isFiniteNumber(bounds.sMin) ||
    !isFiniteNumber(bounds.sMax) ||
    !isFiniteNumber(bounds.dMin) ||
    !isFiniteNumber(bounds.dMax) ||
    bounds.sMin <= 0 ||
    bounds.sMax <= bounds.sMin ||
    Math.log(bounds.sMax) <= Math.log(bounds.sMin) ||
    bounds.dMax <= bounds.dMin ||
    !Number.isFinite(bounds.dMax - bounds.dMin)
  ) {
    return { issues: [{ message: 'Expected valid Cost ADR bounds' }] }
  }

  return {
    value: {
      coefficients: Array.from(value.coefficients),
      costWeightMin: value.costWeightMin,
      costWeightMax: value.costWeightMax,
      retentionMin: value.retentionMin,
      retentionMax: value.retentionMax,
      bounds: {
        sMin: bounds.sMin,
        sMax: bounds.sMax,
        dMin: bounds.dMin,
        dMax: bounds.dMax,
      },
    },
  }
})

export type CostAdrConfig = {
  readonly costAdrPolicy: CostAdrPolicy
  /** Finite value in [0, 1024]; clamped to the policy's cost-weight range. */
  readonly goalCostWeight: number
}

export const costAdrConfigSchema = defineSchema<CostAdrConfig>((value) => {
  if (
    !isObject(value) ||
    !isFiniteNumber(value.goalCostWeight) ||
    value.goalCostWeight < 0 ||
    value.goalCostWeight > 1024
  ) {
    return {
      issues: [{ message: 'Expected finite goalCostWeight in [0, 1024]' }],
    }
  }
  const policy = costAdrPolicySchema['~standard'].validate(value.costAdrPolicy)
  if (policy.issues) return policy
  return {
    value: {
      costAdrPolicy: policy.value,
      goalCostWeight: value.goalCostWeight,
    },
  }
})
