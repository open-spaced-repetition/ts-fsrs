import { numericChrono } from '@/chrono/presets/numeric/chrono.js'
import type {
  Middleware,
  MiddlewareNext,
  ReviewMiddlewareContext,
  RollbackMiddlewareContext,
} from '@/middleware/index.js'
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
  desiredRetention: 0.9,
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

type SourceMiddlewareEnv = {
  readonly config: typeof sourceConfigSchema
  readonly card: typeof sourceCardSchema
  readonly revlog: typeof auditRevlogSchema
}

export const sourceMiddleware: Middleware<
  SourceMiddlewareEnv,
  typeof sourceMiddlewareName
> = {
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
    review<Result>(
      ctx: ReviewMiddlewareContext<SourceMiddlewareEnv>,
      next: MiddlewareNext<Result>
    ): Result {
      const result = next() as {
        readonly card: Record<string, unknown>
        readonly revlog: Record<string, unknown>
      }
      result.card.source = ctx.config.source
      result.revlog.audit = ctx.config.source
      ctx.result = result
      return result as Result
    },
    rollback<Result>(
      ctx: RollbackMiddlewareContext<SourceMiddlewareEnv>,
      next: MiddlewareNext<Result>
    ): Result {
      const restored = next() as Readonly<Record<string, unknown>>
      const resultCard = {
        ...restored,
        source: ctx.config.source,
      }
      ctx.result = { card: resultCard }
      return ctx.result.card as Result
    },
  },
}

export const statusMiddleware: Middleware<
  {
    readonly scheduleStatus: 'suspend' | 'buried'
  },
  typeof statusMiddlewareName
> = {
  name: statusMiddlewareName,
}
