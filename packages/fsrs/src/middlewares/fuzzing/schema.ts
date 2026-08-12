import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'

export type FuzzingConfig = {
  readonly enableFuzz: boolean
  readonly maximumInterval: number
}

export type FuzzingCardFields = {
  readonly cardId: string | number
  readonly reps: number
}

export type FuzzingRevlogFields = {
  readonly cardId: string | number
}

export type FuzzingCardInitInput = {
  readonly cardId?: string | number
}

function parseCardId(value: unknown): string | number | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

export const fuzzingConfigSchema = defineSchema<FuzzingConfig>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected fuzzing config object' }] }
  }

  const { enableFuzz, maximumInterval } = value
  if (typeof enableFuzz !== 'boolean') {
    return { issues: [{ message: 'Expected enableFuzz boolean' }] }
  }
  if (
    typeof maximumInterval !== 'number' ||
    !Number.isInteger(maximumInterval) ||
    maximumInterval <= 0
  ) {
    return {
      issues: [{ message: 'Expected positive integer maximumInterval' }],
    }
  }

  return { value: { enableFuzz, maximumInterval } }
})

export const fuzzingCardInitInputSchema = defineSchema<FuzzingCardInitInput>(
  (value) => {
    if (!isObject(value)) {
      return {
        issues: [{ message: 'Expected fuzzing card init input object' }],
      }
    }

    if (value.cardId === undefined) return { value: {} }
    const cardId = parseCardId(value.cardId)
    return cardId === undefined
      ? { issues: [{ message: 'Expected new card cardId' }] }
      : { value: { cardId } }
  }
)

export const fuzzingCardFieldsSchema = defineSchema<FuzzingCardFields>(
  (value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected card cardId' }] }
    }
    const cardId = parseCardId(value.cardId)
    if (cardId === undefined) {
      return { issues: [{ message: 'Expected card cardId' }] }
    }
    const { reps } = value
    if (typeof reps !== 'number' || !Number.isInteger(reps) || reps < 0) {
      return { issues: [{ message: 'Expected non-negative integer reps' }] }
    }
    return { value: { cardId, reps } }
  }
)

export const fuzzingRevlogFieldsSchema = defineSchema<FuzzingRevlogFields>(
  (value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected revlog cardId' }] }
    }
    const cardId = parseCardId(value.cardId)
    return cardId === undefined
      ? { issues: [{ message: 'Expected revlog cardId' }] }
      : { value: { cardId } }
  }
)
