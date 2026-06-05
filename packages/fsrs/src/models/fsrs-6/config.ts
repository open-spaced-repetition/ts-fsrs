import { z } from 'zod/mini'

export const FSRS6ConfigSchema = z.object({
  weights: z.array(z.number()).check(z.length(21)),
  enableShortTerm: z._default(z.boolean(), true),
  numRelearningSteps: z._default(z.number(), 0),
})

// Input (numRelearningSteps optional) / output (defaulted) derived from the schema.
export type FSRS6ConfigInput = z.input<typeof FSRS6ConfigSchema>
export type FSRS6Config = z.output<typeof FSRS6ConfigSchema>
