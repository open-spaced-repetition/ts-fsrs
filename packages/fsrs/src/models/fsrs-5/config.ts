import { z } from 'zod/mini'

export const FSRS5ConfigSchema = z.object({
  weights: z.array(z.number()).check(z.length(19)),
  enableShortTerm: z._default(z.boolean(), true),
})

// Input (enableShortTerm optional) / output (defaulted) derived from the schema.
export type FSRS5ConfigInput = z.input<typeof FSRS5ConfigSchema>
export type FSRS5Config = z.output<typeof FSRS5ConfigSchema>
