import { z } from 'zod'
import { getSupportedTimezones } from '../utils/timezone'

const supportedTimezones = getSupportedTimezones()

const trainingConfigSchema = z.discriminatedUnion('modelVersion', [
  z.object({
    modelVersion: z.literal('FSRS-6'),
    enableShortTerm: z.boolean().default(true),
    enableSchedPenalties: z.literal(false).default(false),
    numRelearningSteps: z.int().min(0).max(10).default(1),
  }),
  z.object({
    modelVersion: z.literal('FSRS-7'),
    enableShortTerm: z.literal(true).default(true),
    enableSchedPenalties: z.boolean().default(false),
    numRelearningSteps: z.undefined().optional(),
  }),
])

export const trainingSchema = trainingConfigSchema.and(
  z.object({
    nextDayStartsAt: z.int().min(0).max(23).default(4),
    timezone: z
      .string()
      .refine(
        (value) => supportedTimezones.includes(value),
        'Unsupported timezone.'
      )
      .default('Asia/Shanghai'),
  })
)

// FormData strings are decoded explicitly before the shared typed validation.
const formBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
const formInteger = z.string().regex(/^\d+$/).transform(Number)
export const trainingFormSchema = z
  .object({
    modelVersion: z.string().default('FSRS-7'),
    enableShortTerm: formBoolean.optional(),
    enableSchedPenalties: formBoolean.optional(),
    numRelearningSteps: formInteger.optional(),
    nextDayStartsAt: formInteger.optional(),
    timezone: z.string().optional(),
  })
  .pipe(trainingSchema)

export type TrainingConfig = z.infer<typeof trainingConfigSchema>
export type TrainingParameters = z.infer<typeof trainingSchema>
export type ModelVersion = TrainingConfig['modelVersion']
