import { numericChrono } from '@/chrono/presets/numeric/chrono.js'
import { defineMiddleware } from '@/middleware/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { defineSchema, isObject } from '@/schema/index.js'
import { defineScheduler } from './define-scheduler.js'

export const createSM2NumericScheduler = () =>
  defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  })

export const config = {
  weights: SM2_DEFAULT_WEIGHTS,
}

export const sourceConfigSchema = defineSchema<{ readonly source: string }>(
  (value) => {
    if (isObject(value) && typeof value.source === 'string') {
      return { value: { source: value.source } }
    }
    return { issues: [{ message: 'Expected source config' }] }
  }
)

export function defineStringFieldConfigSchema<const Field extends string>(
  field: Field
) {
  return defineSchema<{ readonly [K in Field]: string }>((value) => {
    if (isObject(value) && typeof value[field] === 'string') {
      return {
        value: { [field]: value[field] } as { readonly [K in Field]: string },
      }
    }
    return { issues: [{ message: `Expected ${field} config` }] }
  })
}

export const sourceCardSchema = defineSchema<
  unknown,
  { readonly source: string }
>((value) => {
  if (isObject(value) && typeof value.source === 'string') {
    return { value: { source: value.source } }
  }
  return { issues: [{ message: 'Expected source card field' }] }
})

export const auditRevlogSchema = defineSchema<
  unknown,
  { readonly audit: string }
>((value) => {
  if (isObject(value) && typeof value.audit === 'string') {
    return { value: { audit: value.audit } }
  }
  return { issues: [{ message: 'Expected audit revlog field' }] }
})

export const sourceMiddlewareName = 'sourceMiddleware'
export const statusMiddlewareName = Symbol('statusMiddleware')

export const sourceMiddleware = defineMiddleware({
  name: sourceMiddlewareName,
  schema: {
    config: sourceConfigSchema,
    card: sourceCardSchema,
    revlog: auditRevlogSchema,
  },
  defaultValue: {
    card(ctx) {
      return { source: ctx.config.source }
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
      return ctx.result
    },
    rollback(ctx, next) {
      next()
      ctx.result.card.source = ctx.config.source
      return ctx.result.card
    },
  },
})

export const statusMiddleware = defineMiddleware({
  name: statusMiddlewareName,
  scheduleStatus: ['suspend', 'buried'],
})
