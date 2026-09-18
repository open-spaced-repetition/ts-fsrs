import {
  defineSchema,
  desiredRetentionSchema,
  type Grade,
  grades,
  isObject,
} from '@open-spaced-repetition/srs-kit'

export type DesiredRetentionConfig = {
  /** Must be strictly between 0 and 1. */
  readonly desiredRetention: Record<Grade, number>
}

export type DesiredRetentionConfigInput = {
  readonly desiredRetention: number | Record<Grade, number>
}

export const desiredRetentionConfigSchema = defineSchema<
  DesiredRetentionConfigInput,
  DesiredRetentionConfig
>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
  }
  const retention = value.desiredRetention
  const desiredRetention = {} as Record<Grade, number>
  if (typeof retention === 'number') {
    const result = desiredRetentionSchema.safeParse(retention)
    if (!result.success) {
      return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
    }
    for (const grade of grades) {
      desiredRetention[grade] = result.data
    }
  } else {
    if (!isObject(retention)) {
      return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
    }
    for (const grade of grades) {
      const result = desiredRetentionSchema.safeParse(retention[grade])
      if (!result.success) {
        return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
      }
      desiredRetention[grade] = result.data
    }
  }

  return {
    value: {
      desiredRetention,
    },
  }
})
