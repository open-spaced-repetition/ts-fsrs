import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'

export type DesiredRetentionConfig = {
  readonly desiredRetention: number
}

export const desiredRetentionConfigSchema =
  defineSchema<DesiredRetentionConfig>((value) => {
    if (
      !isObject(value) ||
      typeof value.desiredRetention !== 'number' ||
      !Number.isFinite(value.desiredRetention) ||
      value.desiredRetention <= 0 ||
      value.desiredRetention > 1
    ) {
      return { issues: [{ message: 'Expected desiredRetention in (0, 1]' }] }
    }

    return { value: { desiredRetention: value.desiredRetention } }
  })
