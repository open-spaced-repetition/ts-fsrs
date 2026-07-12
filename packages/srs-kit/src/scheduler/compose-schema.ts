/** biome-ignore-all lint/suspicious/noExplicitAny: runtime generic dispatch */

import type { AnyChrono } from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import { gradeSchema } from '@/primitives/rating.js'
import { stateSchema } from '@/primitives/state.js'
import { scheduleStatuses } from '@/primitives/status.js'
import { rememberAttachedValue } from '@/schema/attached-value.js'
import {
  assignObjectFields,
  defineSchema,
  isObject,
  type StandardSchemaV1,
} from '@/schema/index.js'
import type {
  SchedulerCoreFields,
  SchedulerRevlogCoreFields,
} from './fields.js'
import type { SchedulerSchema } from './scheduler.js'

export const parsedModelConfigSymbol = Symbol('parsedModelConfig')
export const parsedCardMemoryStateSymbol = Symbol('parsedCardMemoryState')

export function composeSchema(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): SchedulerSchema<any> {
  const { model, chrono, middlewares } = ctx
  const modelConfigSchema = model.schema.config
  const chronoSchema = chrono.schema
  const chronoConfigSchema = chronoSchema.config
  const chronoCardSchema = chronoSchema.card
  const chronoRevlogSchema = chronoSchema.revlog

  const scheduleStatusSchema = defineSchema<string>((value) => {
    if (typeof value !== 'string') {
      return { issues: [{ message: 'Expected scheduleStatus string' }] }
    }

    let isKnownStatus = scheduleStatuses.includes(value as any)
    for (const middleware of middlewares) {
      if (isKnownStatus) break
      isKnownStatus = middleware.scheduleStatus?.includes(value) === true
    }
    if (!isKnownStatus) {
      return { issues: [{ message: 'Expected known scheduleStatus' }] }
    }

    return { value }
  })

  const parseCoreFields = (
    fields: Record<string, unknown>,
    options?: { readonly rating?: boolean }
  ): StandardSchemaV1.Result<
    SchedulerCoreFields | SchedulerRevlogCoreFields
  > => {
    const scheduleStatus = scheduleStatusSchema['~standard'].validate(
      fields.scheduleStatus
    )
    if (scheduleStatus.issues) return scheduleStatus

    const state = stateSchema['~standard'].validate(fields.state)
    if (state.issues) return state

    if (!options?.rating) {
      return {
        value: { state: state.value, scheduleStatus: scheduleStatus.value },
      }
    }

    const rating = gradeSchema['~standard'].validate(fields.rating)
    if (rating.issues) return rating

    return {
      value: {
        state: state.value,
        scheduleStatus: scheduleStatus.value,
        rating: rating.value,
      },
    }
  }

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

    const result: Record<PropertyKey, unknown> = { chrono: chronoValue }
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

    return {
      value: rememberAttachedValue(
        result,
        parsedModelConfigSymbol,
        modelResult.value
      ),
    }
  })

  const cardInitInput = defineSchema<
    unknown,
    {
      readonly input: Record<string, unknown>
      readonly now?: unknown
    }
  >((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected card init input object' }] }
    }

    const { now, ...middlewareValue } = value

    let firstMiddlewareFields: Record<string, unknown> | undefined
    let combinedFields: Record<string, unknown> | undefined
    for (const middleware of middlewares) {
      const schema = middleware.schema?.cardInitInput
      if (!schema) continue
      const middlewareResult = schema['~standard'].validate(middlewareValue)
      if (middlewareResult.issues) return middlewareResult
      const fields = middlewareResult.value as Record<string, unknown>
      if (firstMiddlewareFields === undefined) {
        firstMiddlewareFields = fields
        continue
      }
      combinedFields ??= Object.assign({}, firstMiddlewareFields)
      assignObjectFields(combinedFields, fields)
    }

    return {
      value: { input: combinedFields ?? firstMiddlewareFields ?? {}, now },
    }
  })

  const card = defineSchema<unknown, Record<string, unknown>>((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected card object' }] }
    }

    const modelResult = model.schema.memoryState['~standard'].validate(value)
    if (modelResult.issues) return modelResult

    const memoryState = modelResult.value as Record<string, unknown>
    const card: Record<string, unknown> = Object.assign({}, memoryState)

    if (chronoCardSchema) {
      const chronoCard = chronoCardSchema['~standard'].validate(value)
      if (chronoCard.issues) return chronoCard
      Object.assign(card, chronoCard.value)
    }

    const coreFields = parseCoreFields(value)
    if (coreFields.issues) return coreFields
    // Explicitly inject scheduler core fields into the parsed card.
    card.state = coreFields.value.state
    card.scheduleStatus = coreFields.value.scheduleStatus

    for (const middleware of middlewares) {
      const schema = middleware.schema?.card
      if (!schema) continue
      const middlewareCard = schema['~standard'].validate(value)
      if (middlewareCard.issues) return middlewareCard
      Object.assign(card, middlewareCard.value)
    }

    return {
      value: rememberAttachedValue(
        card,
        parsedCardMemoryStateSymbol,
        memoryState
      ),
    }
  })

  const revlog = defineSchema<unknown, Record<string, unknown>>((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected revlog object' }] }
    }

    const modelResult = model.schema.memoryState['~standard'].validate(value)
    if (modelResult.issues) return modelResult

    // Reuse the parsed memory state for revlog hot paths to avoid another allocation.
    const result = modelResult.value as Record<string, unknown>

    if (chronoRevlogSchema) {
      const chronoRevlog = chronoRevlogSchema['~standard'].validate(value)
      if (chronoRevlog.issues) return chronoRevlog
      Object.assign(result, chronoRevlog.value)
    }

    const coreFields = parseCoreFields(value, {
      rating: true,
    }) as StandardSchemaV1.Result<SchedulerRevlogCoreFields>
    if (coreFields.issues) return coreFields
    // Explicitly inject scheduler core fields into the parsed revlog.
    result.scheduleStatus = coreFields.value.scheduleStatus
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
    cardInitInput,
    card,
    revlog,
    scheduleStatus: scheduleStatusSchema,
  }
}
