import { numericChrono } from '@/chrono/presets/numeric/chrono.js'
import { defineMiddleware } from '@/middleware/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { defineSchema, isObject } from '@/schema/index.js'
import {
  defineStringFieldOutputSchema,
  defineStringFieldSchema,
} from '@/schema/string-field.test.js'
import { defineScheduler } from './define-scheduler.js'

export const createSM2NumericScheduler = () =>
  defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  })

export const config = {
  weights: SM2_DEFAULT_WEIGHTS,
}

export const sourceConfigSchema = defineStringFieldSchema({
  field: 'source',
  message: 'Expected source config',
})

export function defineStringFieldConfigSchema<const Field extends string>(
  field: Field
) {
  return defineStringFieldSchema({
    field,
    message: `Expected ${field} config`,
  })
}

export const sourceCardSchema = defineStringFieldOutputSchema({
  field: 'source',
  message: 'Expected source card field',
})

export const sourceCardInitInputSchema = defineSchema<{
  readonly source?: string
}>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected source card init input' }] }
  }
  if (value.source === undefined) return { value: {} }
  return typeof value.source === 'string'
    ? { value: { source: value.source } }
    : { issues: [{ message: 'Expected source card init input' }] }
})

export const auditRevlogSchema = defineStringFieldOutputSchema({
  field: 'audit',
  message: 'Expected audit revlog field',
})

export const sourceMiddlewareName = 'sourceMiddleware'
export const statusMiddlewareName = Symbol('statusMiddleware')

export const sourceMiddleware = defineMiddleware({
  name: sourceMiddlewareName,
  schema: {
    config: sourceConfigSchema,
    cardInitInput: sourceCardInitInputSchema,
    card: sourceCardSchema,
    revlog: auditRevlogSchema,
  },
  defaultValue: {
    card(ctx) {
      return {
        source:
          ctx.operation === 'newCard'
            ? (ctx.input.source ?? ctx.config.source)
            : ctx.config.source,
      }
    },
    revlog(ctx) {
      return { audit: ctx.config.source }
    },
  },
  handlers: {
    review(ctx, next) {
      next()
      ctx.result.card.source = ctx.config.source
      ctx.result.revlog.audit = ctx.config.source
    },
    rollback(ctx, next) {
      next()
      ctx.result.card.source = ctx.config.source
    },
  },
})

export const statusMiddleware = defineMiddleware({
  name: statusMiddlewareName,
  scheduleStatus: ['suspend', 'buried'],
})
