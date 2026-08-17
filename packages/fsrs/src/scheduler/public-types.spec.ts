import {
  dateChrono,
  defineScheduler,
  type SchedulerCreate,
  type SchedulerEnvFor,
} from 'ts-fsrs'
import { schedulerStatsMiddleware } from 'ts-fsrs/middlewares'
import { FSRS6Model } from 'ts-fsrs/models/fsrs-6'
import { describe, expectTypeOf, it } from 'vitest'

const middlewares = [schedulerStatsMiddleware] as const

type PublicSchedulerCreate = SchedulerCreate<
  SchedulerEnvFor<typeof FSRS6Model, typeof dateChrono, typeof middlewares>,
  typeof FSRS6Model,
  typeof dateChrono
>

describe('public scheduler types', () => {
  it('names a composed scheduler without importing srs-kit', () => {
    const definition = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).use(...middlewares)

    expectTypeOf(definition.create).toEqualTypeOf<PublicSchedulerCreate>()
  })
})
