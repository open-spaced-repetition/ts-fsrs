import {
  dateChrono,
  defineScheduler,
  type Grade,
  type PreviewResult,
  type SchedulerCreate,
  type SchedulerEnvFor,
  type State,
} from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerLeechMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6'
import { describe, expectTypeOf, it } from 'vitest'

const middlewares = [schedulerStatsMiddleware] as const

type PublicSchedulerCreate = SchedulerCreate<
  SchedulerEnvFor<typeof FSRS6Model, typeof dateChrono, typeof middlewares>,
  typeof FSRS6Model,
  typeof dateChrono
>

const previewSchedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(
  schedulerLeechMiddleware,
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware
)

type FSRSScheduler = ReturnType<typeof previewSchedulerDefinition.create>
type SchedulerPreviews = ReturnType<FSRSScheduler['preview']>
type SchedulerPreview =
  SchedulerPreviews extends Iterable<infer Preview> ? Preview : never

describe('public scheduler types', () => {
  it('names a composed scheduler without importing srs-kit', () => {
    const definition = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).use(...middlewares)

    expectTypeOf(definition.create).toEqualTypeOf<PublicSchedulerCreate>()
  })

  it('flattens previews from a full middleware stack', () => {
    expectTypeOf<SchedulerPreviews>().toEqualTypeOf<
      PreviewResult<{
        card: SchedulerPreview['card']
        revlog: SchedulerPreview['revlog']
      }>
    >()
    expectTypeOf<SchedulerPreview>().toEqualTypeOf<{
      card: {
        state: State
        scheduleStatus: 'new' | 'learning' | 'review' | 'suspended'
        dueAt: Date
        lastReviewAt: Date | null
        stability: number
        difficulty: number
        learningStep: number
        scheduledDays: number
        cardId: string | number
        reps: number
        lapses: number
      }
      revlog: {
        state: State
        scheduleStatus: 'new' | 'learning' | 'review' | 'suspended'
        rating: Grade
        dueAt: Date
        reviewTime: Date
        stability: number
        difficulty: number
        learningStep: number
        scheduledDays: number
        cardId: string | number
      }
      readonly grade: Grade
    }>()
  })
})
