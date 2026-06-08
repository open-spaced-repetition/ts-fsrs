import { FSRSValidationError } from '../error.js'
import { Grades } from '../help.js'
import { compose } from '../kit/middleware.js'
import type { IFSRSModel } from '../kit/types.js'
import { type FSRSState, type Grade, Rating } from '../models.js'
import type {
  NormalizedSchedulerReviewInput,
  PreviewResult,
  RatingCandidateStore,
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
import type { SchedulerDescriptor } from './descriptor.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'
import type { SchemaOutput } from './standard-schema.js'

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
  readonly candidates: RatingCandidateStore<
    SchemaOutput<Model['memoryStateSchema']>
  >
}

export function createRatingCandidates<
  Config extends object,
  MemoryState extends FSRSState = FSRSState,
>(
  model: IFSRSModel<Config, MemoryState>,
  previousMemoryState: MemoryState,
  elapsedDays: number
): RatingCandidateStore<MemoryState> {
  const cache = new Map<Grade, MemoryState>()

  return (rating) => {
    const cached = cache.get(rating)
    if (cached) {
      return cached
    }

    const memoryState = model.step({
      memoryState: previousMemoryState,
      rating,
      elapsedDays,
    })
    cache.set(rating, memoryState)
    return memoryState
  }
}

export class Runner<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  private readonly reviewHandler: (
    ctx: ReviewContext<Model, Middlewares>
  ) => ReviewResult<Model, Middlewares>

  private readonly rollbackHandler: (
    ctx: RollbackContext<Model, Middlewares>
  ) => ReviewCard<Model, Middlewares>

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
      candidates: createRatingCandidates(
        this.options.model,
        card,
        input.elapsedDays
      ),
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

    return results as PreviewResult<Model, Middlewares>
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
      candidates: session.candidates,
      store: createRuntimeStore<Middlewares>(),
      result: createReviewResult(session, rating),
    }

    return this.reviewHandler(ctx)
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
    }

    return this.rollbackHandler(ctx)
  }

  reset(
    input: SchedulerResetInput<Model, Middlewares>
  ): ReviewCard<Model, Middlewares> {
    return this.options.descriptor.resetCard(input.card)
  }
}

function createReviewTerminal<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(): (
  ctx: ReviewContext<Model, Middlewares>
) => ReviewResult<Model, Middlewares> {
  return (ctx) => {
    Object.assign(ctx.result.card, ctx.result.memoryState)
    return ctx.result
  }
}

function createReviewResult<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(
  session: ReviewSession<Model, Middlewares>,
  rating: Grade
): ReviewResult<Model, Middlewares> {
  const card = {
    ...session.card,
  } as ReviewCard<Model, Middlewares>
  const log = {
    ...session.card,
    rating,
  } as ReviewResult<Model, Middlewares>['log']
  let memoryState: SchemaOutput<Model['memoryStateSchema']> | undefined

  return {
    get memoryState() {
      if (memoryState) {
        return memoryState
      }

      memoryState = session.candidates(rating)
      return memoryState
    },
    card,
    log,
  }
}

function createRollbackTerminal<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(): (
  ctx: RollbackContext<Model, Middlewares>
) => ReviewCard<Model, Middlewares> {
  return (ctx) => {
    const previousCard = Object.assign({}, ctx.input.revlog) as ReviewCard<
      Model,
      Middlewares
    > & { rating?: Grade }
    delete previousCard.rating
    return previousCard
  }
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
