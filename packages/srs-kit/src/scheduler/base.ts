/** biome-ignore-all lint/suspicious/noExplicitAny: runtime generic dispatch */
import type {
  AnyChrono,
  AnyChronoCore,
  ChronoDefaultRuntimeFn,
  ChronoProjectionRuntimeSchema,
} from '@/chrono/chrono.js'
import type {
  AnyMiddleware,
  ReviewCandidateContext,
} from '@/middleware/index.js'
import type { AnyModel, AnyModelCore } from '@/model/model.js'
import { type Grade, grades } from '@/primitives/rating.js'
import type { Mutable, SchemaInput } from '@/schema/index.js'
import {
  composeMiddleware,
  createLazyIterable,
  parse,
  withCache,
} from '@/schema/index.js'
import { getParsedCardMemoryState } from './compose-schema.js'
import type { SchedulerDefaultValueFactory } from './default-value.js'
import type {
  BlankSchedulerEnv,
  PreviewResult,
  ScheduleResult,
  SchedulerCore,
  SchedulerCoreEnv,
  SchedulerSchema,
} from './scheduler.js'

export interface BaseSchedulerContext<Env extends BlankSchedulerEnv> {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly schema: SchedulerSchema<Env>
  readonly defaultValue: SchedulerDefaultValueFactory
  readonly middlewares?: readonly AnyMiddleware[]
  readonly config: SchemaInput<Env['config']>
}

interface PreparedReview<Env extends BlankSchedulerEnv> {
  readonly card: Readonly<SchedulerCoreEnv<Env>['card']['output']>
  readonly time: {
    readonly previous: SchedulerCoreEnv<Env>['chrono']
    readonly current: SchedulerCoreEnv<Env>['chrono']
  }
  readonly elapsedDays: number
  readonly memoryState: Record<string, unknown>
  readonly retrievability?: number
  readonly candidate: {
    readonly step: (grade: Grade) => Record<string, unknown>
    readonly nextInterval: (
      memoryState: Readonly<Record<string, unknown>>,
      desiredRetention: number
    ) => number
  }
}

type ReviewResultDraft<Env extends BlankSchedulerEnv> = {
  readonly card: Partial<Mutable<SchedulerCoreEnv<Env>['card']['output']>> &
    Record<string, unknown>
  readonly revlog: Partial<Mutable<SchedulerCoreEnv<Env>['revlog']['output']>> &
    Record<string, unknown>
}

type RollbackResultDraft<Env extends BlankSchedulerEnv> = {
  readonly card: Partial<Mutable<SchedulerCoreEnv<Env>['card']['output']>> &
    Record<string, unknown>
}

type ReviewMiddlewareOperationContext<Env extends BlankSchedulerEnv> = {
  readonly config: Readonly<SchedulerCoreEnv<Env>['config']>
  readonly input: {
    readonly card: Readonly<SchedulerCoreEnv<Env>['card']['output']>
    readonly grade: Grade
    readonly now: SchedulerCoreEnv<Env>['chrono']
  }
  desiredRetention: number
  readonly elapsedDays: number
  scheduledDays?: number
  readonly candidate: ReviewCandidateContext
  result: ReviewResultDraft<Env>
}

type RollbackMiddlewareOperationContext<Env extends BlankSchedulerEnv> = {
  readonly config: Readonly<SchedulerCoreEnv<Env>['config']>
  readonly input: {
    readonly card: Readonly<SchedulerCoreEnv<Env>['card']['output']>
    readonly revlog: Readonly<SchedulerCoreEnv<Env>['revlog']['output']>
  }
  result: RollbackResultDraft<Env>
}

type ReviewRuntimeHandler<Env extends BlankSchedulerEnv> = (
  operation: ReviewMiddlewareOperationContext<Env>,
  next: () => ReviewResultDraft<Env>
) => ReviewResultDraft<Env>

type RollbackRuntimeHandler<Env extends BlankSchedulerEnv> = (
  operation: RollbackMiddlewareOperationContext<Env>,
  next: () => Readonly<Record<string, any>>
) => Readonly<Record<string, any>>

type ReviewInputContext<Env extends BlankSchedulerEnv> =
  ReviewMiddlewareOperationContext<Env>['input']

class ReviewInput<Env extends BlankSchedulerEnv>
  implements ReviewInputContext<Env>
{
  constructor(private input: ReviewMiddlewareOperationContext<Env>['input']) {}

  get card(): ReviewInputContext<Env>['card'] {
    return this.input.card
  }

  set card(_value: ReviewInputContext<Env>['card']) {
    throw new Error('Review input card cannot be changed')
  }

  get grade(): Grade {
    return this.input.grade
  }

  set grade(_value: Grade) {
    throw new Error('Review input grade cannot be changed')
  }

  get now(): SchedulerCoreEnv<Env>['chrono'] {
    return this.input.now
  }

  set now(_value: SchedulerCoreEnv<Env>['chrono']) {
    throw new Error('Review input now cannot be changed')
  }
}

export class BaseScheduler<Env extends BlankSchedulerEnv = BlankSchedulerEnv>
  implements SchedulerCore<SchedulerCoreEnv<Env>>
{
  readonly config: Readonly<SchedulerCoreEnv<Env>['config']>

  private readonly model: AnyModel
  private readonly chrono: AnyChrono
  private readonly defaultValue: SchedulerDefaultValueFactory
  private readonly modelCore: AnyModelCore
  private readonly chronoCore: AnyChronoCore
  private readonly schema: SchedulerSchema<Env>
  private readonly reviewHandlers: readonly (
    | ReviewRuntimeHandler<Env>
    | undefined
  )[]
  private readonly rollbackHandlers: readonly (
    | RollbackRuntimeHandler<Env>
    | undefined
  )[]

  constructor(ctx: BaseSchedulerContext<Env>) {
    const { model, chrono, schema, defaultValue, middlewares = [] } = ctx
    this.model = model
    this.chrono = chrono
    this.schema = schema
    this.defaultValue = defaultValue

    const config = parse(schema.config, ctx.config)

    this.config = config
    this.modelCore = model.create({ config })
    this.chronoCore = Reflect.apply(chrono.create, chrono, [
      { config: config.chrono },
    ])
    this.reviewHandlers = middlewares.map(
      (middleware) => middleware.handlers?.review
    ) as readonly (ReviewRuntimeHandler<Env> | undefined)[]
    this.rollbackHandlers = middlewares.map(
      (middleware) => middleware.handlers?.rollback
    ) as readonly (RollbackRuntimeHandler<Env> | undefined)[]
  }

  newCard = (options?: {
    readonly now?: SchedulerCoreEnv<Env>['chrono']
  }): SchedulerCoreEnv<Env>['card']['output'] => {
    const now = this.parseNow(options?.now ?? this.chronoCore.now())
    return this.defaultValue.newCard<SchedulerCoreEnv<Env>['card']['output']>({
      config: this.config,
      time: now,
    })
  }

  review = (input: {
    readonly card: SchedulerCoreEnv<Env>['card']['input']
    readonly grade: Grade
    readonly now?: SchedulerCoreEnv<Env>['chrono']
  }): ScheduleResult<
    SchedulerCoreEnv<Env>['card']['output'],
    SchedulerCoreEnv<Env>['revlog']['output']
  > => {
    const { card: inputCard, grade } = input
    const now = this.parseNow(input.now ?? this.chronoCore.now())
    const prepared = this.prepareReview(inputCard, now)
    const ctx: ReviewMiddlewareOperationContext<Env> = {
      config: this.config,
      input: new ReviewInput<Env>({ card: prepared.card, grade, now }),
      desiredRetention: this.config.desiredRetention,
      elapsedDays: prepared.elapsedDays,
      candidate: prepared.candidate,
      result: { card: {}, revlog: {} },
    }

    composeMiddleware(this.reviewHandlers, ctx, (ctx) =>
      this.finalizeReview(prepared, ctx)
    )
    return {
      card: parse(
        this.schema.card,
        ctx.result.card
      ) as SchedulerCoreEnv<Env>['card']['output'],
      revlog: parse(
        this.schema.revlog,
        ctx.result.revlog
      ) as SchedulerCoreEnv<Env>['revlog']['output'],
    }
  }

  preview = (input: {
    readonly card: SchedulerCoreEnv<Env>['card']['input']
    readonly now?: SchedulerCoreEnv<Env>['chrono']
  }): PreviewResult<
    SchedulerCoreEnv<Env>['card']['output'],
    SchedulerCoreEnv<Env>['revlog']['output']
  > => {
    const inputCard = input.card
    const now = this.parseNow(input.now ?? this.chronoCore.now())
    const prepared = this.prepareReview(inputCard, now)

    return createLazyIterable(grades, (grade) => {
      const ctx: ReviewMiddlewareOperationContext<Env> = {
        config: this.config,
        input: new ReviewInput<Env>({ card: prepared.card, grade, now }),
        desiredRetention: this.config.desiredRetention,
        elapsedDays: prepared.elapsedDays,
        candidate: prepared.candidate,
        result: { card: {}, revlog: {} },
      }
      composeMiddleware(this.reviewHandlers, ctx, (ctx) =>
        this.finalizeReview(prepared, ctx)
      )
      return {
        grade,
        card: parse(
          this.schema.card,
          ctx.result.card
        ) as SchedulerCoreEnv<Env>['card']['output'],
        revlog: parse(
          this.schema.revlog,
          ctx.result.revlog
        ) as SchedulerCoreEnv<Env>['revlog']['output'],
      }
    })
  }

  rollback = (input: {
    readonly card: SchedulerCoreEnv<Env>['card']['output']
    readonly revlog: SchedulerCoreEnv<Env>['revlog']['output']
  }): SchedulerCoreEnv<Env>['card']['output'] => {
    const { card: inputCard, revlog: inputRevlog } = input
    const revlog = parse(
      this.schema.revlog,
      inputRevlog
    ) as SchedulerCoreEnv<Env>['revlog']['output']
    if (revlog.scheduleStatus === 'new') {
      let time = null
      const chronoRevlogSchema = this.chrono.schema.revlog
      if (chronoRevlogSchema) {
        time = parse(this.chrono.projection, {
          revlog: revlog,
        }).current
      } else {
        time = this.chronoCore.now()
      }

      return parse(
        this.schema.card,
        this.defaultValue.newCard<SchedulerCoreEnv<Env>['card']['output']>({
          config: this.config,
          time,
        })
      ) as SchedulerCoreEnv<Env>['card']['output']
    }

    const card = parse(
      this.schema.card,
      inputCard
    ) as SchedulerCoreEnv<Env>['card']['output']

    const ctx: RollbackMiddlewareOperationContext<Env> = {
      config: this.config,
      input: {
        card: Object.freeze(card),
        revlog: Object.freeze(revlog),
      },
      result: { card: {} },
    }

    composeMiddleware(this.rollbackHandlers, ctx, (ctx) =>
      this.finalizeRollback(ctx)
    )

    return parse(
      this.schema.card,
      ctx.result.card
    ) as SchedulerCoreEnv<Env>['card']['output']
  }

  private prepareReview(
    inputCard: SchedulerCoreEnv<Env>['card']['input'],
    now: SchedulerCoreEnv<Env>['chrono']
  ): PreparedReview<Env> {
    const parsedCard = parse(
      this.schema.card,
      inputCard
    ) as SchedulerCoreEnv<Env>['card']['output']
    const memoryState = getParsedCardMemoryState(parsedCard) as
      | Record<string, unknown>
      | undefined
    if (!memoryState) {
      throw new Error('Parsed scheduler card is missing model memory state')
    }

    const card = Object.freeze(parsedCard)
    const time = parse<ChronoProjectionRuntimeSchema>(this.chrono.projection, {
      card,
      time: now,
    }) as PreparedReview<Env>['time']

    const elapsedDays = this.chronoCore.difference(time.previous, time.current)

    const retrievability = this.modelCore.forgettingCurve(
      memoryState,
      elapsedDays
    )
    const step = withCache(
      (grade: Grade) =>
        this.modelCore.step({
          memoryState,
          rating: grade,
          elapsedDays,
          retrievability,
        }),
      { lru: false }
    )
    const nextInterval = withCache(
      ([nextMemoryState, desiredRetention]: readonly [
        Readonly<Record<string, unknown>>,
        number,
      ]) => this.modelCore.nextInterval(nextMemoryState, desiredRetention),
      { lru: false }
    )

    return {
      card,
      time,
      elapsedDays,
      memoryState,
      retrievability,
      candidate: {
        step,
        nextInterval(memoryState, desiredRetention) {
          return nextInterval([memoryState, desiredRetention])
        },
      },
    }
  }

  private finalizeReview(
    prepared: PreparedReview<Env>,
    ctx: ReviewMiddlewareOperationContext<Env>
  ): ReviewResultDraft<Env> {
    const { memoryState } = prepared
    const { grade } = ctx.input
    const result = ctx.result
    const newMemoryState = ctx.candidate.step(grade)
    const scheduledDays = ctx.candidate.nextInterval(
      newMemoryState,
      ctx.desiredRetention
    )
    ctx.scheduledDays = scheduledDays

    Object.assign(result.card, newMemoryState, {
      scheduleStatus: 'review',
      scheduledDays,
    })
    Object.assign(result.revlog, memoryState, {
      scheduleStatus: prepared.card.scheduleStatus,
      scheduledDays: prepared.card.scheduledDays,
    })
    this.applyChronoDefaults(result, prepared, scheduledDays)

    ctx.result = result
    return ctx.result
  }

  private finalizeRollback(
    ctx: RollbackMiddlewareOperationContext<Env>
  ): Readonly<Record<string, any>> {
    const result = ctx.result
    const revlog = ctx.input.revlog

    Object.assign(result.card, parse(this.model.schema.memoryState, revlog))
    result.card.scheduleStatus = revlog.scheduleStatus
    result.card.scheduledDays = revlog.scheduledDays
    this.applyRollbackChronoDefaults(result, revlog)

    ctx.result = result
    return ctx.result.card
  }

  private applyChronoDefaults(
    result: ReviewResultDraft<Env>,
    prepared: PreparedReview<Env>,
    scheduledDays: number
  ): void {
    const chronoCardDefault = this.chrono.defaultValue
      ?.card as ChronoDefaultRuntimeFn
    if (chronoCardDefault) {
      Object.assign(
        result.card,
        chronoCardDefault({
          config: this.config.chrono,
          time: this.chronoCore.add(prepared.time.current, scheduledDays),
          previous: prepared.time,
        })
      )
    }

    const chronoRevlogDefault = this.chrono.defaultValue
      ?.revlog as ChronoDefaultRuntimeFn
    if (chronoRevlogDefault) {
      Object.assign(
        result.revlog,
        chronoRevlogDefault({
          config: this.config.chrono,
          time: prepared.time.current,
          previous: prepared.time,
        })
      )
    }
  }

  private applyRollbackChronoDefaults(
    result: RollbackResultDraft<Env>,
    revlog: Readonly<SchedulerCoreEnv<Env>['revlog']['output']>
  ): void {
    const chronoCardSchema = this.chrono.schema.card
    if (!chronoCardSchema) {
      return
    }
    const projection = parse<ChronoProjectionRuntimeSchema>(
      this.chrono.projection,
      {
        revlog,
      }
    )
    const cardFields = this.chrono.defaultValue?.card?.({
      config: this.config.chrono,
      previous: {
        previous: 0,
        current: projection.previous,
      },
      time: projection.current,
    })
    if (cardFields) {
      Object.assign(result.card, cardFields)
    }
  }

  private parseNow(now: unknown): SchedulerCoreEnv<Env>['chrono'] {
    return parse(this.chrono.schema.time, now)
  }
}
