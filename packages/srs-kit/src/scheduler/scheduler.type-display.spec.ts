/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, it } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/chrono.js'
import type { Middleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { defineSchema, isObject } from '@/schema/index.js'
import { defineScheduler } from './define-scheduler.js'

const sm2NumericScheduler = defineScheduler({
  model: SM2Model,
  chrono: numericChrono,
}).use(schedulerStatsMiddleware)

const baseSm2NumericScheduler = defineScheduler({
  model: SM2Model,
  chrono: numericChrono,
})

const sm2NumericCore = sm2NumericScheduler.create({
  config: { weights: SM2_DEFAULT_WEIGHTS },
})

const sourceCardSchema = defineSchema<unknown, { readonly source: string }>(
  (value) => {
    if (isObject(value) && typeof value.source === 'string') {
      return { value: { source: value.source } }
    }
    return { issues: [{ message: 'Expected source' }] }
  }
)

const auditRevlogSchema = defineSchema<unknown, { readonly audit: string }>(
  (value) => {
    if (isObject(value) && typeof value.audit === 'string') {
      return { value: { audit: value.audit } }
    }
    return { issues: [{ message: 'Expected audit' }] }
  }
)

const auditMiddlewareName = Symbol('auditMiddleware')

const auditMiddleware: Middleware<
  {
    readonly card: typeof sourceCardSchema
    readonly revlog: typeof auditRevlogSchema
  },
  typeof auditMiddlewareName
> = {
  name: auditMiddlewareName,
  schema: {
    card: sourceCardSchema,
    revlog: auditRevlogSchema,
  },
  defaultValue: {
    card() {
      return { source: 'default' }
    },
    revlog() {
      return { audit: 'default' }
    },
  },
  handlers: {
    review(_ctx, next) {
      return next()
    },
  },
}

const symbolNamedMiddleware = auditMiddleware

const sm2NumericSchedulerWithMiddleware = defineScheduler({
  model: SM2Model,
  chrono: numericChrono,
}).use(auditMiddleware, schedulerStatsMiddleware)

const sm2NumericCoreWithMiddleware = sm2NumericSchedulerWithMiddleware.create({
  config: { weights: SM2_DEFAULT_WEIGHTS },
})

const SELF = 'src/scheduler/scheduler.type-display.spec.ts'

describe('defineScheduler type display', () => {
  const service = getTypeDisplayService()

  const expectedSchedulers = {
    baseSm2NumericScheduler: `const baseSm2NumericScheduler: ComposableScheduler<"sm2", {
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
            readonly chrono: Record<string, never>;
        };
    }>;
    readonly card: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    }>;
}>`,
    sm2NumericScheduler: `const sm2NumericScheduler: ComposableScheduler<"sm2", {
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
            readonly chrono: Record<string, never>;
        };
    }>;
    readonly card: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    }>;
}>`,
    sm2NumericSchedulerWithMiddleware: `const sm2NumericSchedulerWithMiddleware: ComposableScheduler<"sm2", {
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
            readonly chrono: Record<string, never>;
        };
    }>;
    readonly card: SRSSchema<{
        input: {
            readonly source: string;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        output: {
            readonly source: string;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly audit: string;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly audit: string;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    }>;
}>`,
  }

  const expectedCores = {
    sm2NumericCoreWithMiddleware: `const sm2NumericCoreWithMiddleware: SchedulerCore<{
    readonly config: {
        readonly weights: readonly number[];
        readonly chrono: Record<string, never>;
    };
    readonly card: {
        readonly input: {
            readonly source: string;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        readonly output: {
            readonly source: string;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly audit: string;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly audit: string;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
}>`,
    sm2NumericCore: `const sm2NumericCore: SchedulerCore<{
    readonly config: {
        readonly weights: readonly number[];
        readonly chrono: Record<string, never>;
    };
    readonly card: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly elapsedDays: number;
            readonly lapses: number;
            readonly state: State;
            readonly rating: Grade;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly scheduledDays: number;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
}>`,
  }

  const expectedMiddlewares = {
    symbolNamedMiddleware: `const symbolNamedMiddleware: Middleware<{
    readonly card: typeof sourceCardSchema;
    readonly revlog: typeof auditRevlogSchema;
}, typeof auditMiddlewareName>`,
  }

  it('keeps scheduler hovers readable with composed env', () => {
    for (const [marker, expected] of Object.entries(expectedSchedulers)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('shows SchedulerCore<T> for scheduler.create()', () => {
    for (const [marker, expected] of Object.entries(expectedCores)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('keeps symbol middleware names readable', () => {
    for (const [marker, expected] of Object.entries(expectedMiddlewares)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })
}, 20_000)
