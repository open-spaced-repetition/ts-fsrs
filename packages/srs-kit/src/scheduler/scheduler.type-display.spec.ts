/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, it } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/chrono.js'
import { defineMiddleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import type { Grade } from '@/primitives/rating.js'
import type { Mutable, SRSSchema } from '@/schema/index.js'
import { defineStringFieldOutputSchema } from '@/schema/string-field.test.js'
import { defineScheduler } from './define-scheduler.js'
import type {
  SchedulerConfigInputOf,
  SchedulerConfigOutputOf,
} from './infer.js'
import type {
  PreviewResult,
  ScheduleResult,
  SchedulerCore,
  SchedulerDefaultValue,
  SchedulerNewCardFn,
} from './scheduler.js'

const sm2NumericScheduler = defineScheduler({
  model: SM2Model,
  chrono: numericChrono,
}).use(schedulerStatsMiddleware)

type SM2NumericSchedulerConfigInput = SchedulerConfigInputOf<
  typeof sm2NumericScheduler
>
type SM2NumericSchedulerConfigOutput = SchedulerConfigOutputOf<
  typeof sm2NumericScheduler
>

const baseSm2NumericScheduler = defineScheduler({
  model: SM2Model,
  chrono: numericChrono,
})

const sm2NumericCore = sm2NumericScheduler.create({
  config: { weights: SM2_DEFAULT_WEIGHTS },
})

const { model, chrono } = sm2NumericCore

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
    review(ctx, next) {
      next()
      ctx.result.card.source = ctx.input.card.source
      ctx.result.revlog.audit = 'default'
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

const defaultNewCard = sm2NumericSchedulerWithMiddleware.defaultValue.newCard(
  {
    operation: 'newCard',
    config: sm2NumericSchedulerWithMiddleware.schema.config.parse({
      weights: SM2_DEFAULT_WEIGHTS,
    }),
    input: sm2NumericSchedulerWithMiddleware.schema.cardInitInput.parse({})
      .input,
  },
  0
)

const mappedPreview = sm2NumericCoreWithMiddleware
  .preview({ card: sm2NumericCoreWithMiddleware.newCard({ now: 0 }), now: 0 })
  .map((item) => item)

interface MemoryStateForDisplay {
  readonly stability: number
  readonly difficulty: number
}

type ComposedCardForDisplay = Mutable<
  Omit<
    Mutable<MemoryStateForDisplay & { dueAt: Date }> & {
      readonly reps: number
    },
    'dueAt'
  > & {
    readonly dueAt: Date
    readonly learningStep: number
  }
>

type ComposedRevlogForDisplay = Mutable<
  Omit<Mutable<{ reviewedAt: Date; readonly rating: Grade }>, 'rating'> & {
    readonly rating: Grade
  }
>
type NewCardEnvForDisplay = {
  readonly config: object
  readonly cardInitInput: { readonly now?: Date }
  readonly card: {
    readonly input: ComposedCardForDisplay
    readonly output: ComposedCardForDisplay
  }
  readonly revlog: {
    readonly input: ComposedRevlogForDisplay
    readonly output: ComposedRevlogForDisplay
  }
  readonly chrono: Date
  readonly scheduleStatus: 'new' | 'learning' | 'review'
}

declare const newCardForDisplay: SchedulerNewCardFn<NewCardEnvForDisplay>
function displayNewCard(card: ReturnType<typeof newCardForDisplay>) {
  return card
}

const composedNewCardForDisplay = displayNewCard({
  stability: 1,
  difficulty: 2,
  dueAt: new Date(0),
  reps: 0,
  learningStep: 0,
})

declare const coreForDisplay: SchedulerCore<NewCardEnvForDisplay>

function displayForgottenCard(card: ReturnType<typeof coreForDisplay.forget>) {
  return card
}

const forgottenCardForDisplay = displayForgottenCard({
  stability: 1,
  difficulty: 2,
  dueAt: new Date(0),
  reps: 0,
  learningStep: 0,
})

function displayRolledBackCard(
  card: ReturnType<typeof coreForDisplay.rollback>
) {
  return card
}

const rolledBackCardForDisplay = displayRolledBackCard({
  stability: 1,
  difficulty: 2,
  dueAt: new Date(0),
  reps: 0,
  learningStep: 0,
})

type DefaultValueEnvForDisplay = {
  readonly chrono: Date
  readonly config: SRSSchema<{ input: object; output: object }>
  readonly cardInitInput: SRSSchema<{
    input: { readonly now?: Date }
    output: { readonly input: object; readonly now?: unknown }
  }>
  readonly card: SRSSchema<{
    input: ComposedCardForDisplay
    output: ComposedCardForDisplay
  }>
  readonly revlog: SRSSchema<{
    input: ComposedRevlogForDisplay
    output: ComposedRevlogForDisplay
  }>
  readonly scheduleStatus: 'new' | 'learning' | 'review'
}

declare const defaultValueForDisplay: SchedulerDefaultValue<DefaultValueEnvForDisplay>

function displayDefaultValueCard(
  card: ReturnType<typeof defaultValueForDisplay.newCard>
) {
  return card
}

const defaultValueCardForDisplay = displayDefaultValueCard({
  stability: 1,
  difficulty: 2,
  dueAt: new Date(0),
  reps: 0,
  learningStep: 0,
  state: 0,
  scheduleStatus: 'new',
})

interface FSRSSchedulerForDisplay {
  readonly preview: () => PreviewResult<
    ScheduleResult<ComposedCardForDisplay, ComposedRevlogForDisplay>
  >
}

type SchedulerPreviews = ReturnType<FSRSSchedulerForDisplay['preview']>
type SchedulerPreview =
  SchedulerPreviews extends Iterable<infer Preview> ? Preview : never

declare const previewCollectionForDisplay: SchedulerPreviews

function displaySchedulerPreview(preview: SchedulerPreview) {
  return preview
}

const inferredSchedulerPreview = displaySchedulerPreview({
  card: {
    stability: 1,
    difficulty: 2,
    dueAt: new Date(0),
    reps: 0,
    learningStep: 0,
  },
  revlog: {
    reviewedAt: new Date(0),
    rating: 1,
  },
  grade: 1,
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
    readonly cardInitInput: SchedulerCardInitSchema<number>;
    readonly card: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
            rating: Grade;
        };
    }>;
}, Model<{
    readonly name: "sm2";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
        };
    }>;
    readonly memoryState: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
    }>;
    readonly algorithm: null;
}>, Chrono<{
    readonly time: SRSSchema<{
        input: {};
        output: number;
    }>;
    readonly fields: {};
}>>`,
    sm2NumericScheduler: `const sm2NumericScheduler: ComposableScheduler<"sm2", {
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
            readonly clearStatsOnForget?: boolean | undefined;
        };
        output: {
            readonly weights: readonly number[];
            readonly chrono: Record<string, never>;
            readonly clearStatsOnForget: boolean;
        };
    }>;
    readonly cardInitInput: SchedulerCardInitSchema<number>;
    readonly card: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            reps: number;
            lapses: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
            rating: Grade;
        };
    }>;
}, Model<{
    readonly name: "sm2";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
        };
    }>;
    readonly memoryState: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
    }>;
    readonly algorithm: null;
}>, Chrono<{
    readonly time: SRSSchema<{
        input: {};
        output: number;
    }>;
    readonly fields: {};
}>>`,
    sm2NumericSchedulerWithMiddleware: `const sm2NumericSchedulerWithMiddleware: ComposableScheduler<"sm2", {
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
            readonly clearStatsOnForget?: boolean | undefined;
        };
        output: {
            readonly weights: readonly number[];
            readonly chrono: Record<string, never>;
            readonly clearStatsOnForget: boolean;
        };
    }>;
    readonly cardInitInput: SchedulerCardInitSchema<number>;
    readonly card: SRSSchema<{
        input: {
            readonly source?: string | undefined;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        output: {
            source: string;
            interval: number;
            easeFactor: number;
            reviewStep: number;
            reps: number;
            lapses: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly audit?: string | undefined;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            audit: string;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
            rating: Grade;
        };
    }>;
}, Model<{
    readonly name: "sm2";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
        };
    }>;
    readonly memoryState: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
    }>;
    readonly algorithm: null;
}>, Chrono<{
    readonly time: SRSSchema<{
        input: {};
        output: number;
    }>;
    readonly fields: {};
}>>`,
  }

  const expectedCores = {
    sm2NumericCoreWithMiddleware: `const sm2NumericCoreWithMiddleware: SchedulerCore<{
    readonly config: {
        readonly weights: readonly number[];
        readonly chrono: Record<string, never>;
        readonly clearStatsOnForget: boolean;
    };
    readonly cardInitInput: {
        readonly now?: number | undefined;
    };
    readonly card: {
        readonly input: {
            readonly source?: string | undefined;
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        readonly output: {
            source: string;
            interval: number;
            easeFactor: number;
            reviewStep: number;
            reps: number;
            lapses: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly audit?: string | undefined;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        readonly output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            audit: string;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
            rating: Grade;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
}, ModelCore<{
    readonly config: {
        readonly weights: readonly number[];
    };
    readonly memoryState: {
        readonly interval: number;
        readonly easeFactor: number;
        readonly reviewStep: number;
    };
    readonly algorithm: null;
}>, ChronoCore<number>>`,
    sm2NumericCore: `const sm2NumericCore: SchedulerCore<{
    readonly config: {
        readonly weights: readonly number[];
        readonly chrono: Record<string, never>;
        readonly clearStatsOnForget: boolean;
    };
    readonly cardInitInput: {
        readonly now?: number | undefined;
    };
    readonly card: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly reps: number;
            readonly lapses: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
        };
        readonly output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            reps: number;
            lapses: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review";
            readonly rating: Grade;
        };
        readonly output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review";
            rating: Grade;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review";
}, ModelCore<{
    readonly config: {
        readonly weights: readonly number[];
    };
    readonly memoryState: {
        readonly interval: number;
        readonly easeFactor: number;
        readonly reviewStep: number;
    };
    readonly algorithm: null;
}>, ChronoCore<number>>`,
  }

  const expectedPreviews = {
    previewCollectionForDisplay: `const previewCollectionForDisplay: PreviewResult<{
    card: {
        reps: number;
        stability: number;
        difficulty: number;
        dueAt: Date;
        learningStep: number;
    };
    revlog: {
        reviewedAt: Date;
        rating: Grade;
    };
}>`,
    mappedPreview: `const mappedPreview: {
    card: {
        source: string;
        interval: number;
        easeFactor: number;
        reviewStep: number;
        reps: number;
        lapses: number;
        state: State;
        scheduleStatus: "new" | "learning" | "review";
    };
    revlog: {
        interval: number;
        easeFactor: number;
        reviewStep: number;
        audit: string;
        state: State;
        scheduleStatus: "new" | "learning" | "review";
        rating: Grade;
    };
    readonly grade: Grade;
}[]`,
    inferredSchedulerPreview: `const inferredSchedulerPreview: {
    card: {
        reps: number;
        stability: number;
        difficulty: number;
        dueAt: Date;
        learningStep: number;
    };
    revlog: {
        reviewedAt: Date;
        rating: Grade;
    };
    readonly grade: Grade;
}`,
  }

  const expectedDefaultValues = {
    composedNewCardForDisplay: `const composedNewCardForDisplay: {
    reps: number;
    stability: number;
    difficulty: number;
    dueAt: Date;
    learningStep: number;
}`,
    forgottenCardForDisplay: `const forgottenCardForDisplay: {
    reps: number;
    stability: number;
    difficulty: number;
    dueAt: Date;
    learningStep: number;
}`,
    rolledBackCardForDisplay: `const rolledBackCardForDisplay: {
    reps: number;
    stability: number;
    difficulty: number;
    dueAt: Date;
    learningStep: number;
}`,
    defaultValueCardForDisplay: `const defaultValueCardForDisplay: {
    reps: number;
    stability: number;
    difficulty: number;
    dueAt: Date;
    learningStep: number;
    state: State;
    scheduleStatus: "new" | "learning" | "review";
}`,
    defaultNewCard: `const defaultNewCard: {
    source: string;
    interval: number;
    easeFactor: number;
    reviewStep: number;
    reps: number;
    lapses: number;
    state: State;
    scheduleStatus: "new" | "learning" | "review";
}`,
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
    readonly cardInitInput: SchedulerCardInitSchema<number>;
    readonly card: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
    }>;
    readonly revlog: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
            readonly rating: Grade;
        };
        output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review" | "suspend";
            rating: Grade;
        };
    }>;
}, Model<{
    readonly name: "sm2";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
        };
    }>;
    readonly memoryState: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
        };
    }>;
    readonly algorithm: null;
}>, Chrono<{
    readonly time: SRSSchema<{
        input: {};
        output: number;
    }>;
    readonly fields: {};
}>>`,
    sm2WithSuspendCore: `const sm2WithSuspendCore: SchedulerCore<{
    readonly config: {
        readonly weights: readonly number[];
        readonly chrono: Record<string, never>;
    };
    readonly cardInitInput: {
        readonly now?: number | undefined;
    };
    readonly card: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
        readonly output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review" | "suspend";
        };
    };
    readonly revlog: {
        readonly input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reviewStep: number;
            readonly state: State;
            readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
            readonly rating: Grade;
        };
        readonly output: {
            interval: number;
            easeFactor: number;
            reviewStep: number;
            state: State;
            scheduleStatus: "new" | "learning" | "review" | "suspend";
            rating: Grade;
        };
    };
    readonly chrono: number;
    readonly scheduleStatus: "new" | "learning" | "review" | "suspend";
}, ModelCore<{
    readonly config: {
        readonly weights: readonly number[];
    };
    readonly memoryState: {
        readonly interval: number;
        readonly easeFactor: number;
        readonly reviewStep: number;
    };
    readonly algorithm: null;
}>, ChronoCore<number>>`,
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

  const expectedConfigs = {
    SM2NumericSchedulerConfigInput: `type SM2NumericSchedulerConfigInput = {
    readonly weights: readonly number[];
    readonly clearStatsOnForget?: boolean | undefined;
}`,
    SM2NumericSchedulerConfigOutput: `type SM2NumericSchedulerConfigOutput = {
    readonly weights: readonly number[];
    readonly chrono: Record<string, never>;
    readonly clearStatsOnForget: boolean;
}`,
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

  it('shows labeled preview types and flat mapped fields', () => {
    for (const [marker, expected] of Object.entries(expectedPreviews)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('shows flattened card types for card-returning APIs', () => {
    for (const [marker, expected] of Object.entries(expectedDefaultValues)) {
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

  it('shows the flattened scheduler config input and output', () => {
    for (const [marker, expected] of Object.entries(expectedConfigs)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })
}, 60_000)
