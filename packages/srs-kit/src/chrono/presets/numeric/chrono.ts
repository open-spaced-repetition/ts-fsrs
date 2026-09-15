import { defineChrono } from '@/chrono/define-chrono.js'
import { numberSchema } from '@/schema/field.js'
import { numericTimeNormalizer } from './schema.js'

export const numericChrono = defineChrono({
  schema: {
    time: numberSchema,
  },
  normalize: numericTimeNormalizer,
  create() {
    return {
      now,
      difference,
      add,
    }
  },
})

const now = (): number => 0
const difference = (from: number, to: number): number => to - from
const add = (from: number, days: number): number => from + days
