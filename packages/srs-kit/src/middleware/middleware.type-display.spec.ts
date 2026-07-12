/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, it } from 'vitest'
import { defineSchema, isObject } from '@/schema/index.js'
import {
  defineStringFieldOutputSchema,
  defineStringFieldSchema,
} from '@/schema/string-field.test.js'
import { defineMiddleware } from './middleware.js'

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
      const reviewCardHoverTarget = ctx.input.card
      const reviewResultRevlogHoverTarget = ctx.result.revlog
      next()
      ctx.result.card.source = reviewConfigHoverTarget.source
      ctx.result.revlog.audit = reviewConfigHoverTarget.source
    },
    rollback(ctx, next) {
      const rollbackRevlogHoverTarget = ctx.input.revlog
      next()
      ctx.result.card.source = rollbackRevlogHoverTarget.audit
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
    reviewCardHoverTarget: `const reviewCardHoverTarget: {
    readonly source: string;
    readonly state: State;
    readonly scheduleStatus: string;
}`,
    reviewResultRevlogHoverTarget: `const reviewResultRevlogHoverTarget: {
    [x: string]: unknown;
    audit?: string | undefined;
    state?: 0 | 1 | 2 | 3 | undefined;
    scheduleStatus?: string | undefined;
    rating?: 1 | 2 | 3 | 4 | undefined;
}`,
    rollbackRevlogHoverTarget: `const rollbackRevlogHoverTarget: {
    readonly audit: string;
    readonly state: State;
    readonly scheduleStatus: string;
    readonly rating: Grade;
}`,
    scheduleStatusHoverTarget: `const scheduleStatusHoverTarget: readonly "paused"[] | undefined`,
  }

  it('infers defineMiddleware definition and context hovers', () => {
    for (const [marker, expected] of Object.entries(expectedDefineMiddleware)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })
}, 20_000)
