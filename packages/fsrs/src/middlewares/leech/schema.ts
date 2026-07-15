import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'

export type LeechConfigInput = {
  readonly leechThreshold?: number
}

export type LeechConfig = {
  readonly leechThreshold: number
}

export type LeechCardFields = {
  readonly lapses: number
}

export const DEFAULT_LEECH_THRESHOLD = 0

export const leechConfigSchema = defineSchema<LeechConfigInput, LeechConfig>(
  (value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected leech config object' }] }
    }

    const leechThreshold =
      value.leechThreshold === undefined
        ? DEFAULT_LEECH_THRESHOLD
        : value.leechThreshold
    if (
      typeof leechThreshold !== 'number' ||
      !Number.isInteger(leechThreshold) ||
      leechThreshold < 0
    ) {
      return {
        issues: [{ message: 'Expected non-negative integer leechThreshold' }],
      }
    }

    return { value: { leechThreshold } }
  }
)

export const leechCardFieldsSchema = defineSchema<LeechCardFields>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected leech card fields' }] }
  }

  const { lapses } = value
  if (typeof lapses !== 'number' || !Number.isInteger(lapses) || lapses < 0) {
    return { issues: [{ message: 'Expected non-negative integer lapses' }] }
  }

  return { value: { lapses } }
})
