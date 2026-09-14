import { defineChronoTimeNormalizer } from '@/chrono/define-chrono.js'
import { numberSchema } from '@/schema/index.js'

export const numericTimeNormalizer = defineChronoTimeNormalizer<{
  readonly time: number
}>((value) => {
  const time = numberSchema['~standard'].validate(value.time)
  if (time.issues) {
    return time
  }

  return { value: { previous: 0, current: time.value } }
})
