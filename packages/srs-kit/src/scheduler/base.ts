import type {
  AnyChrono,
  ChronoProjectionRuntimeSchema,
} from '@/chrono/chrono.js'
import type {
  AnyMiddleware,
  ReviewCandidateContext,
} from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import { type Grade, gradeSchema, grades } from '@/primitives/rating.js'
import { State } from '@/primitives/state.js'
import {
  parsedCardMemoryStateSymbol,
  parsedModelConfigSymbol,
} from '@/scheduler/compose-schema.js'
import { getAttachedValue } from '@/schema/attached-value.js'
import type { Mutable, SchemaInput } from '@/schema/index.js'
import { composeMiddleware, createLazyIterable, parse } from '@/schema/index.js'
import type {
  BlankSchedulerEnv,
  PreviewResult,
  ScheduleResult,
  SchedulerCore,
  SchedulerCoreEnv,
  SchedulerDefaultValue,
  SchedulerDefaultValueContext,
  SchedulerDefinition,
  SchedulerForwardInput,
  SchedulerNewCardFn,
  SchedulerNewCardOptions,
  SchedulerSchema,
} from './scheduler.js'

export interface BaseSchedulerContext<
  Env extends BlankSchedulerEnv,
  M extends AnyModel,
  C extends AnyChrono,
> {
  readonly model: M
  readonly chrono: C
  readonly schema: SchedulerSchema<Env>
  readonly defaultValue: SchedulerDefaultValue<Env>
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
    readonly findGrade: (
      memoryState: Readonly<Record<string, unknown>>
    ) => Grade | undefined
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
  scheduledDays: number | undefined
  readonly candidate: ReviewCandidateContext
  readonly result: ReviewResultDraft<Env>
}

type RollbackMiddlewareOperationContext<Env extends BlankSchedulerEnv> = {
  readonly config: Readonly<SchedulerCoreEnv<Env>['config']>
  readonly input: {
    readonly card: Readonly<SchedulerCoreEnv<Env>['card']['output']>
    readonly revlog: Readonly<SchedulerCoreEnv<Env>['revlog']['output']>
  }
  readonly result: RollbackResultDraft<Env>
}

type ReviewRuntimeHandler<Env extends BlankSchedulerEnv> = (
  operation: ReviewMiddlewareOperationContext<Env>,
  next: () => void
) => void

type RollbackRuntimeHandler<Env extends BlankSchedulerEnv> = (
  operation: RollbackMiddlewareOperationContext<Env>,
  next: () => void
) => void

type ReviewInputContext<Env extends BlankSchedulerEnv> =
  ReviewMiddlewareOperationContext<Env>['input']

const DEFAULT_DESIRED_RETENTION = 0.9
const FORWARD_PREPARE_OPTIONS = { freezeCard: false } as const

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

export class BaseScheduler<
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
  M extends AnyModel = AnyModel,
  C extends AnyChrono = AnyChrono,
> implements
    SchedulerCore<
      SchedulerCoreEnv<Env>,
      ReturnType<M['create']>,
      ReturnType<C['create']>
    >
{
  readonly config: Readonly<SchedulerCoreEnv<Env>['config']>

  readonly model: ReturnType<M['create']>
  readonly chrono: ReturnType<C['create']>
  private readonly schedulerDefinition: SchedulerDefinition<M, C>
  private readonly defaultValue: SchedulerDefaultValue<Env>
  private readonly schema: SchedulerSchema<Env>
  private readonly reviewHandlers: readonly (
    | ReviewRuntimeHandler<Env>
    | undefined
  )[]
  private readonly rollbackHandlers: readonly (
    | RollbackRuntimeHandler<Env>
    | undefined
  )[]

  constructor(ctx: BaseSchedulerContext<Env, M, C>) {
    const { model, chrono, schema, defaultValue, middlewares = [] } = ctx
    this.schedulerDefinition = Object.freeze({ model, chrono })
    this.schema = schema
    this.defaultValue = defaultValue

    const config = parse(schema.config, ctx.config)

    this.config = config
    this.model = model.create({
      config: getAttachedValue<typeof parsedModelConfigSymbol, typeof config>(
        config,
        parsedModelConfigSymbol
      ),
      bypass: true,
    }) as ReturnType<M['create']>
    this.chrono = Reflect.apply(chrono.create, chrono, [
      { config: config.chrono },
    ]) as ReturnType<C['create']>
    this.reviewHandlers = middlewares.map(
      (middleware) => middleware.handlers?.review
    ) as readonly (ReviewRuntimeHandler<Env> | undefined)[]
    this.rollbackHandlers = middlewares.map(
      (middleware) => middleware.handlers?.rollback
    ) as readonly (RollbackRuntimeHandler<Env> | undefined)[]
  }

  get definition(): SchedulerDefinition<M, C> {
    return this.schedulerDefinition
  }

  private readonly createNewCard = (
    options?: SchedulerNewCardOptions<SchedulerCoreEnv<Env>>
  ) => {
    const { now, input } = parse<Env['cardInitInput']>(
      this.schema.cardInitInput,
      options === undefined ? {} : options
    )

    return this.defaultValue.newCard(
      {
        operation: 'newCard',
        config: this.config,
        input: input as Extract<
          SchedulerDefaultValueContext<Env>,
          { readonly operation: 'newCard' }
        >['input'],
      },
      this.parseNow(now)
    )
  }

  newCard = this.createNewCard as SchedulerNewCardFn<SchedulerCoreEnv<Env>>

  /**
   * Replays a review history and returns the card and revlog produced by each
   * review.
   *
   * The history is consumed as given: it must already be sorted by review time
   * and must not contain manual ratings.
   */
  forward = (
    input: SchedulerForwardInput<
      SchedulerCoreEnv<Env>['chrono'],
      SchedulerCoreEnv<Env>['card']['input']
    >
  ): ScheduleResult<
    SchedulerCoreEnv<Env>['card']['output'],
    SchedulerCoreEnv<Env>['revlog']['output']
  >[] => {
    type ForwardResult = ScheduleResult<
      SchedulerCoreEnv<Env>['card']['output'],
      SchedulerCoreEnv<Env>['revlog']['output']
    >

    const { history } = input

    // Nothing to replay: skip both the card initialization, which would
    // otherwise read the current time from the chronology, and the initial
    // card validation, for a result that stays empty either way.
    if (history.length === 0) return []

    const results: ForwardResult[] = new Array(history.length)
    const initialCard =
      input.initialCard == null
        ? this.createNewCard({
            now: history[0].reviewTime,
          } as SchedulerNewCardOptions<SchedulerCoreEnv<Env>>)
        : (input.initialCard as SchedulerNewCardOptions<SchedulerCoreEnv<Env>>)
    let card = parse(
      this.schema.card,
      initialCard
    ) as SchedulerCoreEnv<Env>['card']['output']

    for (let index = 0; index < history.length; index++) {
      const review = history[index]
      const now = review.reviewTime
      const prepared = this.prepareParsedReview(
        card,
        now,
        FORWARD_PREPARE_OPTIONS
      )
      const result = this.parseReviewResult(
        this.runReview(prepared, review.rating, now)
      )

      results[index] = result
      card = result.card as SchedulerCoreEnv<Env>['card']['output']
    }

    return results
  }

  forget = (input: {
    readonly card: SchedulerCoreEnv<Env>['card']['input']
    readonly now?: SchedulerCoreEnv<Env>['chrono']
  }): SchedulerCoreEnv<Env>['card']['output'] => {
    const card = parse(
      this.schema.card,
      input.card
    ) as SchedulerCoreEnv<Env>['card']['output']
    const now = this.parseNow(input.now)

    return this.defaultValue.newCard(
      {
        operation: 'forget',
        config: this.config,
        input: card,
      },
      now
    ) as SchedulerCoreEnv<Env>['card']['output']
  }

  review = (input: {
    readonly card: SchedulerCoreEnv<Env>['card']['input']
    readonly grade: Grade
    readonly now?: SchedulerCoreEnv<Env>['chrono']
  }): ScheduleResult<
    SchedulerCoreEnv<Env>['card']['output'],
    SchedulerCoreEnv<Env>['revlog']['output']
  > => {
    const { card: inputCard, grade: inputGrade } = input
    const grade = parse(gradeSchema, inputGrade)
    const now = this.parseNow(input.now)
    const prepared = this.prepareReview(inputCard, now)
    return this.parseReviewResult(this.runReview(prepared, grade, now))
  }

  preview = (input: {
    readonly card: SchedulerCoreEnv<Env>['card']['input']
    readonly now?: SchedulerCoreEnv<Env>['chrono']
  }): PreviewResult<
    ScheduleResult<
      SchedulerCoreEnv<Env>['card']['output'],
      SchedulerCoreEnv<Env>['revlog']['output']
    >
  > => {
    const inputCard = input.card
    const now = this.parseNow(input.now)
    const prepared = this.prepareReview(inputCard, now)

    return createLazyIterable(grades, (grade) => {
      const { card, revlog } = this.parseReviewResult(
        this.runReview(prepared, grade, now)
      )
      return {
        grade,
        card,
        revlog,
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
    this.applyRollbackChronoDefaults(ctx.result, revlog)

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
    return this.prepareParsedReview(parsedCard, now)
  }

  private prepareParsedReview(
    parsedCard: SchedulerCoreEnv<Env>['card']['output'],
    now: SchedulerCoreEnv<Env>['chrono'],
    { freezeCard = true }: { freezeCard?: boolean } = {}
  ): PreparedReview<Env> {
    const memoryState = getAttachedValue<
      typeof parsedCardMemoryStateSymbol,
      PreparedReview<Env>['memoryState']
    >(parsedCard, parsedCardMemoryStateSymbol)
    if (!memoryState) {
      throw new Error('Parsed scheduler card is missing model memory state')
    }

    const card = freezeCard ? Object.freeze(parsedCard) : parsedCard
    const time = parse<ChronoProjectionRuntimeSchema>(
      this.schedulerDefinition.chrono.projection,
      {
        card,
        time: now,
      }
    ) as PreparedReview<Env>['time']

    const elapsedDays =
      card.state === State.New
        ? 0
        : this.chrono.difference(time.previous, time.current)

    const retrievability = this.model.forgettingCurve(memoryState, elapsedDays)
    const memoryStateByGrade = new Map<Grade, Record<string, unknown>>()
    const gradeByMemoryState = new Map<
      Readonly<Record<string, unknown>>,
      Grade
    >()
    const step = (grade: Grade): Record<string, unknown> => {
      let nextMemoryState = memoryStateByGrade.get(grade)
      if (nextMemoryState === undefined) {
        nextMemoryState = this.model.step({
          memoryState,
          rating: grade,
          elapsedDays,
          retrievability,
        }) as Record<string, unknown>
        memoryStateByGrade.set(grade, nextMemoryState)
      }
      gradeByMemoryState.set(nextMemoryState, grade)
      return nextMemoryState
    }
    const findGrade = (nextMemoryState: Readonly<Record<string, unknown>>) =>
      gradeByMemoryState.get(nextMemoryState)
    const intervalCache = new Map<
      Readonly<Record<string, unknown>>,
      Map<number, number>
    >()
    const nextInterval = (
      nextMemoryState: Readonly<Record<string, unknown>>,
      desiredRetention: number
    ): number => {
      let inner = intervalCache.get(nextMemoryState)
      if (inner) {
        const cached = inner.get(desiredRetention)
        if (cached !== undefined) return cached
      } else {
        inner = new Map()
        intervalCache.set(nextMemoryState, inner)
      }
      const value = this.model.nextInterval(nextMemoryState, desiredRetention)
      inner.set(desiredRetention, value)
      return value
    }

    return {
      card,
      time,
      elapsedDays,
      memoryState,
      retrievability,
      candidate: {
        step,
        findGrade,
        nextInterval,
      },
    }
  }

  private runReview(
    prepared: PreparedReview<Env>,
    grade: Grade,
    now: SchedulerCoreEnv<Env>['chrono']
  ): ReviewResultDraft<Env> {
    const ctx: ReviewMiddlewareOperationContext<Env> = {
      config: this.config,
      input: new ReviewInput<Env>({ card: prepared.card, grade, now }),
      desiredRetention: DEFAULT_DESIRED_RETENTION,
      elapsedDays: prepared.elapsedDays,
      scheduledDays: undefined,
      candidate: prepared.candidate,
      result: { card: {}, revlog: {} },
    }

    composeMiddleware(this.reviewHandlers, ctx, (ctx) =>
      this.finalizeReview(prepared, ctx)
    )
    this.applyReviewChronoDefaults(prepared, ctx)
    return ctx.result
  }

  private parseReviewResult(
    result: ReviewResultDraft<Env>
  ): ScheduleResult<
    SchedulerCoreEnv<Env>['card']['output'],
    SchedulerCoreEnv<Env>['revlog']['output']
  > {
    return {
      card: parse(
        this.schema.card,
        result.card
      ) as SchedulerCoreEnv<Env>['card']['output'],
      revlog: parse(
        this.schema.revlog,
        result.revlog
      ) as SchedulerCoreEnv<Env>['revlog']['output'],
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
    ctx.scheduledDays ??= ctx.candidate.nextInterval(
      newMemoryState,
      ctx.desiredRetention
    )

    Object.assign(result.card, newMemoryState, {
      state: State.Review,
      scheduleStatus: 'review',
    })
    Object.assign(result.revlog, memoryState, {
      rating: grade,
      state: prepared.card.state,
      scheduleStatus: prepared.card.scheduleStatus,
    })
    return result
  }

  private finalizeRollback(
    ctx: RollbackMiddlewareOperationContext<Env>
  ): RollbackResultDraft<Env>['card'] {
    const result = ctx.result
    const revlog = ctx.input.revlog

    Object.assign(
      result.card,
      parse(this.schedulerDefinition.model.schema.memoryState, revlog)
    )
    result.card.state = revlog.state
    result.card.scheduleStatus = revlog.scheduleStatus

    return result.card
  }

  private applyReviewChronoDefaults(
    prepared: PreparedReview<Env>,
    ctx: ReviewMiddlewareOperationContext<Env>
  ): void {
    if (ctx.scheduledDays === undefined) {
      throw new Error('Expected scheduledDays after review middleware')
    }
    this.applyChronoDefaults(ctx.result, prepared, ctx.scheduledDays)
  }

  private applyChronoDefaults(
    result: ReviewResultDraft<Env>,
    prepared: PreparedReview<Env>,
    scheduledDays: number
  ): void {
    const chronoCardDefault = this.schedulerDefinition.chrono.defaultValue?.card
    if (chronoCardDefault) {
      Object.assign(
        result.card,
        chronoCardDefault({
          config: this.config.chrono,
          time: this.chrono.add(prepared.time.current, scheduledDays),
          previous: prepared.time,
        })
      )
    }

    const chronoRevlogDefault =
      this.schedulerDefinition.chrono.defaultValue?.revlog
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
    const chronoCardSchema = this.schedulerDefinition.chrono.schema.card
    if (!chronoCardSchema) {
      return
    }
    const projection = parse<ChronoProjectionRuntimeSchema>(
      this.schedulerDefinition.chrono.projection,
      {
        revlog,
      }
    )
    const isNew = revlog.state === State.New
    const cardFields = this.schedulerDefinition.chrono.defaultValue?.card?.({
      config: this.config.chrono,
      previous: isNew
        ? undefined
        : {
            previous: 0,
            current: projection.previous,
          },
      time: isNew ? projection.previous : projection.current,
    })
    if (cardFields) {
      Object.assign(result.card, cardFields)
    }
  }

  private parseNow(now?: unknown): SchedulerCoreEnv<Env>['chrono'] {
    return now === undefined
      ? this.chrono.now()
      : parse(this.schedulerDefinition.chrono.schema.time, now)
  }
}
