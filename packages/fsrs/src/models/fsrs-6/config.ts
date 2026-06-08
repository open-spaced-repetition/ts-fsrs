import { z } from 'zod/mini'
import { stepsSchema } from '../../kit/steps.js'

export const FSRS6ConfigSchema = z.object({
  weights: z.array(z.number()).check(z.length(21)),
  enableShortTerm: z._default(z.boolean(), true),
  relearningSteps: z._default(stepsSchema, ['10m']),
})

// Input (numRelearningSteps optional) / output (defaulted) derived from the schema.
export type FSRS6ConfigInput = z.input<typeof FSRS6ConfigSchema>
export type FSRS6Config = z.output<typeof FSRS6ConfigSchema>
