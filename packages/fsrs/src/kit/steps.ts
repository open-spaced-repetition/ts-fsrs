import { z } from 'zod/mini'
import type { Steps } from '../models.js'

const stepUnitPattern = /^\d+(m|h|d)$/
export const stepsSchema = z.custom<Steps>(
  (value) =>
    Array.isArray(value) &&
    value.every(
      (unit) => typeof unit === 'string' && stepUnitPattern.test(unit)
    )
)
