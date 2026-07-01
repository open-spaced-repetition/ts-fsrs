/** biome-ignore-all lint/suspicious/noExplicitAny: runtime generic dispatch */

import type { AnyChrono } from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import { type Grade, gradeSchema } from '@/primitives/rating.js'
import { type State, stateSchema } from '@/primitives/state.js'
import { defineSchema, isObject } from '@/schema/index.js'
import type { SchedulerSchema } from './scheduler.js'

function assignObjectFields(
  target: Record<PropertyKey, unknown>,
  source: object
) {
  const fields = source as Record<string, unknown>
  for (const key in fields) {
    if (Object.hasOwn(fields, key)) {
      target[key] = fields[key]
    }
  }
}

const coreSchedulerFieldsSchema = defineSchema<{
  readonly state: State
  readonly scheduleStatus: string
  readonly scheduledDays: number
}>((value) => {
  const fields = value as Record<string, unknown> | null | undefined
  if (!fields) {
    return { issues: [{ message: 'Expected scheduleStatus string' }] }
  }

  const scheduleStatus = fields.scheduleStatus
  const scheduledDays = fields.scheduledDays
  const state = stateSchema['~standard'].validate(fields.state)
  if (state.issues) return state

  if (typeof scheduleStatus !== 'string') {
    return { issues: [{ message: 'Expected scheduleStatus string' }] }
  }
  if (typeof scheduledDays !== 'number' || !Number.isFinite(scheduledDays)) {
    return { issues: [{ message: 'Expected finite scheduledDays' }] }
  }

  return { value: { state: state.value, scheduleStatus, scheduledDays } }
})

const coreSchedulerRevlogFieldsSchema = defineSchema<{
  readonly rating: Grade
  readonly state: State
  readonly scheduleStatus: string
  readonly scheduledDays: number
}>((value) => {
  const fields = value as Record<string, unknown> | null | undefined
  if (!fields) {
    return { issues: [{ message: 'Expected scheduleStatus string' }] }
  }

  const scheduleStatus = fields.scheduleStatus
  const scheduledDays = fields.scheduledDays
  if (typeof scheduleStatus !== 'string') {
    return { issues: [{ message: 'Expected scheduleStatus string' }] }
  }
  if (typeof scheduledDays !== 'number' || !Number.isFinite(scheduledDays)) {
    return { issues: [{ message: 'Expected finite scheduledDays' }] }
  }

  const rating = gradeSchema['~standard'].validate(fields.rating)
  if (rating.issues) return rating

  const state = stateSchema['~standard'].validate(fields.state)
  if (state.issues) return state

  return {
    value: {
      scheduleStatus,
      scheduledDays,
      rating: rating.value,
      state: state.value,
    },
  }
})

const parsedCardMemoryState = Symbol('parsedCardMemoryState')

export function getParsedCardMemoryState(
  card: object
): Record<string, any> | undefined {
  return (card as Record<typeof parsedCardMemoryState, Record<string, any>>)[
    parsedCardMemoryState
  ]
}

function rememberParsedCardMemoryState<Card extends object>(
  card: Card,
  memoryState: Record<string, any>
): Card {
  const parsedCard = card as Record<
    typeof parsedCardMemoryState,
    Record<string, any>
  >
  parsedCard[parsedCardMemoryState] = memoryState
  return card
}

export function composeSchema(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): SchedulerSchema<any> {
  const { model, chrono, middlewares } = ctx
  const modelConfigSchema = model.schema.config
  const chronoSchema = chrono.schema as any
  const chronoConfigSchema = chronoSchema.config
  const chronoCardSchema = chronoSchema.card
  const chronoRevlogSchema = chronoSchema.revlog

  const config = defineSchema<unknown, Record<string, unknown>>((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected scheduler config object' }] }
    }

    const modelResult = modelConfigSchema['~standard'].validate(value)
    if (modelResult.issues) return modelResult

    let chronoValue: unknown = {}
    if (chronoConfigSchema) {
      const chronoResult = chronoConfigSchema['~standard'].validate(
        value.chrono
      )
      if (chronoResult.issues) return chronoResult
      chronoValue = chronoResult.value
    }

    const result: Record<PropertyKey, unknown> = {
      // TODO: desiredRetention should be a required field in the future, but for now we will default it to 0.9 if not provided.
      desiredRetention: value.desiredRetention ?? 0.9,
      chrono: chronoValue,
    }
    assignObjectFields(result, modelResult.value)

    for (const middleware of middlewares) {
      const schema = middleware.schema?.config
      if (!schema) {
        continue
      }
      const middlewareResult = schema['~standard'].validate(value)
      if (middlewareResult.issues) {
        return middlewareResult
      }
      assignObjectFields(result, middlewareResult.value)
    }

    return { value: result }
  })

  const card = defineSchema<unknown, Record<string, unknown>>((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected card object' }] }
    }

    const modelResult = model.schema.memoryState['~standard'].validate(value)
    if (modelResult.issues) return modelResult

    const memoryState = modelResult.value as Record<string, any>
    const card: Record<string, unknown> = Object.assign({}, memoryState)

    if (chronoCardSchema) {
      const chronoCard = chronoCardSchema['~standard'].validate(value)
      if (chronoCard.issues) return chronoCard
      Object.assign(card, chronoCard.value)
    }

    const coreFields = coreSchedulerFieldsSchema['~standard'].validate(value)
    if (coreFields.issues) return coreFields
    // Explicitly inject scheduler core fields into the parsed card.
    card.state = coreFields.value.state
    card.scheduleStatus = coreFields.value.scheduleStatus
    card.scheduledDays = coreFields.value.scheduledDays

    for (const middleware of middlewares) {
      const schema = middleware.schema?.card
      if (!schema) continue
      const middlewareCard = schema['~standard'].validate(value)
      if (middlewareCard.issues) return middlewareCard
      Object.assign(card, middlewareCard.value)
    }

    return { value: rememberParsedCardMemoryState(card, memoryState) }
  })

  const revlog = defineSchema<unknown, Record<string, unknown>>((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected revlog object' }] }
    }

    const modelResult = model.schema.memoryState['~standard'].validate(value)
    if (modelResult.issues) return modelResult

    const result = modelResult.value as Record<string, unknown>

    if (chronoRevlogSchema) {
      const chronoRevlog = chronoRevlogSchema['~standard'].validate(value)
      if (chronoRevlog.issues) return chronoRevlog
      Object.assign(result, chronoRevlog.value)
    }

    const coreFields =
      coreSchedulerRevlogFieldsSchema['~standard'].validate(value)
    if (coreFields.issues) return coreFields
    // Explicitly inject scheduler core fields into the parsed revlog.
    result.scheduleStatus = coreFields.value.scheduleStatus
    result.scheduledDays = coreFields.value.scheduledDays
    result.rating = coreFields.value.rating
    result.state = coreFields.value.state

    for (const middleware of middlewares) {
      const schema = middleware.schema?.revlog
      if (!schema) continue
      const middlewareRevlog = schema['~standard'].validate(value)
      if (middlewareRevlog.issues) return middlewareRevlog
      Object.assign(result, middlewareRevlog.value)
    }

    return { value: result }
  })

  return {
    config,
    card,
    revlog,
  }
}
