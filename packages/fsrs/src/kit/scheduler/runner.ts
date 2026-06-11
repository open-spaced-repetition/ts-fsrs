import { FSRSValidationError } from '../../error.js'
import { Grades } from '../../help.js'
import { type Grade, Rating } from '../../models.js'
import { compose } from '../middleware.js'
import type {
  NormalizedSchedulerReviewInput,
  PreviewResult,
  ReviewCard,
  ReviewContext,
  ReviewResult,
  RollbackContext,
  SchedulerConfig,
  SchedulerPreviewInput,
  SchedulerResetInput,
  SchedulerReviewInput,
  SchedulerRollbackInput,
  SchedulerStoreAccessor,
  SchedulerStoreData,
} from './context.js'
import type { ResetFragmentSource, SchedulerDescriptor } from './descriptor.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'

export interface SchedulerRunnerOptions<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly model: ReturnType<Model['create']>
  readonly config: SchedulerConfig<Model, Middlewares>
  readonly descriptor: SchedulerDescriptor<Model, Middlewares>
}

export interface ReviewSession<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCard<Model, Middlewares>
  readonly elapsedDays: number
}

export class Runner<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  private readonly reviewHandler: (
    ctx: ReviewContext<Model, Middlewares>
  ) => void

  private readonly rollbackHandler: (
    ctx: RollbackContext<Model, Middlewares>
  ) => void

  private readonly resetFragment: Partial<ReviewCard<Model, Middlewares>>

  constructor(
    private readonly options: SchedulerRunnerOptions<Model, Middlewares>
  ) {
    this.reviewHandler = compose(
      options.descriptor.reviewHandlers,
      createReviewTerminal<Model, Middlewares>()
    )
    this.rollbackHandler = compose(
      options.descriptor.rollbackHandlers,
      createRollbackTerminal<Model, Middlewares>()
    )
    this.resetFragment = Object.assign(
      {},
      ...options.descriptor.resetFragments.map((source) =>
        resolveResetFragment(source, options.config)
      )
    ) as Partial<ReviewCard<Model, Middlewares>>
  }

  createReviewSession(
    input: Pick<
      SchedulerReviewInput<Model, Middlewares>,
      'card' | 'elapsedDays'
    >
  ): ReviewSession<Model, Middlewares> {
    const card = this.options.descriptor.parseCard(input.card)

    return {
      card,
      elapsedDays: input.elapsedDays,
    }
  }

  review(
    input: SchedulerReviewInput<Model, Middlewares>
  ): ReviewResult<Model, Middlewares> {
    const session = this.createReviewSession(input)
    return this.reviewFromSession(session, input.rating)
  }

  preview(
    input: SchedulerPreviewInput<Model, Middlewares>
  ): PreviewResult<Model, Middlewares> {
    const session = this.createReviewSession(input)
    const results = {} as Record<Grade, ReviewResult<Model, Middlewares>>

    for (const rating of Grades) {
      results[rating] = this.reviewFromSession(session, rating)
    }

    return Object.assign(results, {
      *[Symbol.iterator]() {
        for (const rating of Grades) {
          yield results[rating]
        }
      },
    }) as PreviewResult<Model, Middlewares>
  }

  reviewFromSession(
    session: ReviewSession<Model, Middlewares>,
    rating: Grade
  ): ReviewResult<Model, Middlewares> {
    const normalizedInput: NormalizedSchedulerReviewInput<Model, Middlewares> =
      {
        card: session.card,
        rating,
        elapsedDays: session.elapsedDays,
      }
    const ctx: ReviewContext<Model, Middlewares> = {
      input: normalizedInput,
      config: this.options.config,
      model: this.options.model,
      store: createRuntimeStore<Middlewares>(),
      result: createReviewResult(
        session,
        rating,
        this.options.model,
        this.options.descriptor.parseRevlog(session.card, rating)
      ),
    }

    this.reviewHandler(ctx)
    return ctx.result
  }

  rollback(
    input: SchedulerRollbackInput<Model, Middlewares>
  ): ReviewCard<Model, Middlewares> {
    if ((input.revlog.rating as Rating) === Rating.Manual) {
      throw new FSRSValidationError('Cannot rollback a manual rating')
    }

    const ctx: RollbackContext<Model, Middlewares> = {
      input,
      config: this.options.config,
      model: this.options.model,
      store: createRuntimeStore<Middlewares>(),
      result: createRollbackResult<Model, Middlewares>(input.revlog),
    }

    this.rollbackHandler(ctx)
    return ctx.result
  }

  reset(
    input: SchedulerResetInput<Model, Middlewares>
  ): ReviewCard<Model, Middlewares> {
    return Object.assign(
      {},
      this.options.descriptor.parseCard(input.card),
      this.resetFragment
    ) as ReviewCard<Model, Middlewares>
  }
}

function resolveResetFragment<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(source: ResetFragmentSource, config: SchedulerConfig<Model, Middlewares>) {
  if (typeof source !== 'function') {
    return source
  }

  return (source as (config: SchedulerConfig<Model, Middlewares>) => object)(
    config
  )
}

function createReviewTerminal<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(): (ctx: ReviewContext<Model, Middlewares>) => void {
  return (ctx) => {
    Object.assign(ctx.result.card, ctx.result.memoryState)
  }
}

function createReviewResult<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(
  session: ReviewSession<Model, Middlewares>,
  rating: Grade,
  model: ReturnType<Model['create']>,
  log: ReviewResult<Model, Middlewares>['log']
): ReviewResult<Model, Middlewares> {
  const card = {
    ...session.card,
  } as ReviewCard<Model, Middlewares>
  let memoryState: ReviewResult<Model, Middlewares>['memoryState'] | undefined

  return {
    get memoryState(): ReviewResult<Model, Middlewares>['memoryState'] {
      if (memoryState) {
        return memoryState
      }

      memoryState = model.step({
        memoryState: session.card as unknown as ReviewResult<
          Model,
          Middlewares
        >['memoryState'],
        rating,
        elapsedDays: session.elapsedDays,
      }) as ReviewResult<Model, Middlewares>['memoryState']
      return memoryState
    },
    card,
    log,
  }
}

function createRollbackTerminal<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(): (ctx: RollbackContext<Model, Middlewares>) => void {
  return () => {}
}

function createRollbackResult<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>({
  rating: _rating,
  ...previousCard
}: SchedulerRollbackInput<Model, Middlewares>['revlog']): ReviewCard<
  Model,
  Middlewares
> {
  return previousCard as ReviewCard<Model, Middlewares>
}

function createRuntimeStore<
  Middlewares extends readonly SchedulerMiddleware[],
>(): SchedulerStoreAccessor<SchedulerStoreData<Middlewares>> {
  const store = new Map<PropertyKey, unknown>()

  return {
    get(key: PropertyKey) {
      return store.get(key) as never
    },
    set(key: PropertyKey, value: unknown) {
      store.set(key, value)
    },
  }
}
