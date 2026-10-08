/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { AnySchedulerCore } from '@/scheduler/scheduler.js'
import { defineSchema, isObject } from '@/schema/index.js'
import {
  defineStringFieldOutputSchema,
  defineStringFieldSchema,
} from '@/schema/string-field.test.js'
import {
  defineMiddleware,
  type NextIntervalMiddlewareContext,
  type ReviewMiddlewareContext,
  type RollbackMiddlewareContext,
} from './middleware.js'

const displayConfigSchema = defineStringFieldSchema({
  field: 'source',
  message: 'Expected source config',
})

const displayCardSchema = defineStringFieldOutputSchema({
  field: 'source',
  message: 'Expected source card',
})

const displayRevlogSchema = defineStringFieldOutputSchema({
  field: 'audit',
  message: 'Expected audit revlog',
})

const displayMiddlewareName = Symbol('displayMiddleware')

const displayCardInitInputSchema = defineSchema<
  { readonly rawSource: string },
  { readonly source: string }
>((value) =>
  isObject(value) && typeof value.rawSource === 'string'
    ? { value: { source: value.rawSource } }
    : { issues: [{ message: 'Expected rawSource' }] }
)

const cardInitInputMiddleware = defineMiddleware({
  name: 'cardInitInputMiddleware',
  schema: {
    cardInitInput: displayCardInitInputSchema,
    card: displayCardSchema,
  },
  defaultValue: {
    card(ctx) {
      if (ctx.operation === 'newCard') {
        const cardInitInputHoverTarget = ctx.input
        return { source: cardInitInputHoverTarget.source }
      }
      const forgetCardHoverTarget = ctx.input
      return { source: forgetCardHoverTarget.source }
    },
  },
  handlers: {
    nextInterval(ctx, next) {
      const intervalInstanceHoverTarget = ctx.instance
      const intervalElapsedDaysHoverTarget = ctx.elapsedDays
      next()
    },
    review(ctx, next) {
      const reviewInstanceHoverTarget = ctx.instance
      const reviewRetrievabilityHoverTarget = ctx.retrievability
      const defaultReviewStatusHoverTarget = ctx.input.card.scheduleStatus
      next()
    },
  },
})

const cardInitInputMiddlewareHoverTarget = cardInitInputMiddleware

const displayMiddleware = defineMiddleware({
  name: displayMiddlewareName,
  scheduleStatus: ['paused'],
  schema: {
    config: displayConfigSchema,
    card: displayCardSchema,
    revlog: displayRevlogSchema,
  },
  defaultValue: {
    card(ctx) {
      const defaultConfigHoverTarget = ctx.config
      return { source: defaultConfigHoverTarget.source }
    },
    revlog(ctx) {
      return { audit: ctx.config.source }
    },
  },
  handlers: {
    review(ctx, next) {
      const reviewConfigHoverTarget = ctx.config
      const reviewCardSourceHoverTarget = ctx.input.card.source
      const reviewStatusHoverTarget = ctx.input.card.scheduleStatus
      const reviewResultAuditHoverTarget = ctx.result.revlog.audit
      const reviewResultStatusHoverTarget = ctx.result.revlog.scheduleStatus
      next()
      ctx.result.card.source = reviewConfigHoverTarget.source
      ctx.result.revlog.audit = reviewConfigHoverTarget.source
    },
    rollback(ctx, next) {
      const rollbackInstanceHoverTarget = ctx.instance
      const rollbackAuditHoverTarget = ctx.input.revlog.audit
      const rollbackStatusHoverTarget = ctx.input.revlog.scheduleStatus
      next()
      ctx.result.card.source = rollbackAuditHoverTarget
    },
  },
})

const middlewareHoverTarget = displayMiddleware
const scheduleStatusHoverTarget = displayMiddleware.scheduleStatus

const SELF = 'src/middleware/middleware.type-display.spec.ts'

describe('middleware type display', () => {
  const service = getTypeDisplayService()

  const expectedDefineMiddleware = {
    cardInitInputMiddlewareHoverTarget: `const cardInitInputMiddlewareHoverTarget: Middleware<"cardInitInputMiddleware", {
    readonly cardInitInput: SRSSchema<{
        input: {
            readonly rawSource: string;
        };
        output: {
            readonly source: string;
        };
    }>;
    readonly card: SRSSchema<{
        input: {};
        output: {
            readonly source: string;
        };
    }>;
}>`,
    cardInitInputHoverTarget: `const cardInitInputHoverTarget: {
    readonly source: string;
}`,
    forgetCardHoverTarget: `const forgetCardHoverTarget: {
    readonly source: string;
    readonly state: State;
    readonly scheduleStatus: string;
}`,
    defaultReviewStatusHoverTarget: `const defaultReviewStatusHoverTarget: "new" | "learning" | "review"`,
    middlewareHoverTarget: `const middlewareHoverTarget: Middleware<typeof displayMiddlewareName, {
    readonly scheduleStatus: "paused";
    readonly config: SRSSchema<{
        input: {
            readonly source: string;
        };
        output: {
            readonly source: string;
        };
    }>;
    readonly card: SRSSchema<{
        input: {};
        output: {
            readonly source: string;
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {};
        output: {
            readonly audit: string;
        };
    }>;
}>`,
    defaultConfigHoverTarget: `const defaultConfigHoverTarget: MiddlewareContextConfig<{
    readonly scheduleStatus: "paused";
    readonly config: SRSSchema<{
        input: {
            readonly source: string;
        };
        output: {
            readonly source: string;
        };
    }>;
    readonly card: SRSSchema<{
        input: {};
        output: {
            readonly source: string;
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {};
        output: {
            readonly audit: string;
        };
    }>;
}>`,
    reviewConfigHoverTarget: `const reviewConfigHoverTarget: MiddlewareContextConfig<{
    readonly scheduleStatus: "paused";
    readonly config: SRSSchema<{
        input: {
            readonly source: string;
        };
        output: {
            readonly source: string;
        };
    }>;
    readonly card: SRSSchema<{
        input: {};
        output: {
            readonly source: string;
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {};
        output: {
            readonly audit: string;
        };
    }>;
}>`,
    reviewCardSourceHoverTarget: `const reviewCardSourceHoverTarget: string`,
    intervalInstanceHoverTarget: `const intervalInstanceHoverTarget: AnySchedulerCore`,
    intervalElapsedDaysHoverTarget: `const intervalElapsedDaysHoverTarget: number`,
    reviewInstanceHoverTarget: `const reviewInstanceHoverTarget: AnySchedulerCore`,
    reviewRetrievabilityHoverTarget: `const reviewRetrievabilityHoverTarget: number`,
    rollbackInstanceHoverTarget: `const rollbackInstanceHoverTarget: AnySchedulerCore`,
    reviewStatusHoverTarget: `const reviewStatusHoverTarget: "new" | "learning" | "review" | "paused"`,
    reviewResultAuditHoverTarget: `const reviewResultAuditHoverTarget: string | undefined`,
    reviewResultStatusHoverTarget: `const reviewResultStatusHoverTarget: "new" | "learning" | "review" | "paused" | undefined`,
    rollbackAuditHoverTarget: `const rollbackAuditHoverTarget: string`,
    rollbackStatusHoverTarget: `const rollbackStatusHoverTarget: "new" | "learning" | "review" | "paused"`,
    scheduleStatusHoverTarget: `const scheduleStatusHoverTarget: readonly "paused"[] | undefined`,
  }

  it('infers defineMiddleware definition and context hovers', () => {
    for (const [marker, expected] of Object.entries(expectedDefineMiddleware)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('keeps the exposed runtime fields readonly', () => {
    expectTypeOf<
      Pick<
        ReviewMiddlewareContext,
        'instance' | 'retrievability' | 'elapsedDays'
      >
    >().toEqualTypeOf<{
      readonly instance: AnySchedulerCore
      readonly retrievability: number
      readonly elapsedDays: number
    }>()
    expectTypeOf<NextIntervalMiddlewareContext>().not.toHaveProperty(
      'retrievability'
    )
    expectTypeOf<Pick<RollbackMiddlewareContext, 'instance'>>().toEqualTypeOf<{
      readonly instance: AnySchedulerCore
    }>()
  })
}, 60_000)
