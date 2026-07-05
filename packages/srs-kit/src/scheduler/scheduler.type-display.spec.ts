/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, it } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/chrono.js'
import { defineMiddleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { defineStringFieldOutputSchema } from '@/schema/string-field.test.js'
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

const sourceCardSchema = defineStringFieldOutputSchema({
  field: 'source',
  message: 'Expected source',
})

const auditRevlogSchema = defineStringFieldOutputSchema({
  field: 'audit',
  message: 'Expected audit',
})

const auditMiddlewareName = 'auditMiddleware'

const auditMiddleware = defineMiddleware({
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
      next()
    },
  },
})

const namedMiddleware = auditMiddleware

const suspendMiddleware = defineMiddleware({
  name: 'suspendMiddleware',
  scheduleStatus: ['suspend'],
  handlers: {
    review(_ctx, next) {
      next()
    },
  },
})

const sm2WithSuspend = defineScheduler({
  model: SM2Model,
  chrono: numericChrono,
}).use(suspendMiddleware)

const sm2WithSuspendCore = sm2WithSuspend.create({
  config: { weights: SM2_DEFAULT_WEIGHTS },
})

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
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
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
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
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
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        output: {
            readonly source: string;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly audit: string;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly audit: string;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
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
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        readonly output: {
            readonly source: string;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly audit: string;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly audit: string;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
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
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
}>`,
  }

  const expectedSuspend = {
    sm2WithSuspend: `const sm2WithSuspend: ComposableScheduler<"sm2", {
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
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
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
            readonly rating: Grade;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
            readonly rating: Grade;
        };
    }>;
}>`,
    sm2WithSuspendCore: `const sm2WithSuspendCore: SchedulerCore<{
    readonly config: {
        readonly weights: readonly number[];
        readonly chrono: Record<string, never>;
    };
    readonly card: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
            readonly rating: Grade;
        };
        readonly output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
            readonly rating: Grade;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
}>`,
  }

  const expectedMiddlewares = {
    namedMiddleware: `const namedMiddleware: Middleware<"auditMiddleware", {
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

  it('extends scheduleStatus with middleware-contributed status', () => {
    for (const [marker, expected] of Object.entries(expectedSuspend)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('keeps middleware names readable', () => {
    for (const [marker, expected] of Object.entries(expectedMiddlewares)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })
}, 20_000)
