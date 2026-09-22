import { describe, test } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { Rating } from '@/primitives/index.js'
import { defineScheduler } from '@/scheduler/index.js'

let _schedulerSink: unknown

function consumeScheduler<T>(value: T): void {
  _schedulerSink = value
}

const config = {
  weights: SM2_DEFAULT_WEIGHTS,
}

describe('SM2 numeric scheduler', () => {
  const scheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  }).use(schedulerStatsMiddleware)

  const core = scheduler.create({ config })
  const newCard = core.newCard({ now: 0 })
  const reviewCard = core.review({
    card: newCard,
    grade: Rating.Good,
    now: 0,
  }).card

  function consumePreview(previews: ReturnType<typeof core.preview>) {
    return Array.from(previews)
  }

  test('create', async ({ bench }) => {
    await bench('create', () => {
      scheduler.create({ config })
    }).run()
  })

  test('newCard', async ({ bench }) => {
    await bench('newCard', () => {
      core.newCard({ now: 0 })
    }).run()
  })

  test('review new card', async ({ bench }) => {
    await bench('review new card', () => {
      core.review({ card: newCard, grade: Rating.Good, now: 0 })
    }).run()
  })

  test('review existing card', async ({ bench }) => {
    await bench('review existing card', () => {
      core.review({
        card: reviewCard,
        grade: Rating.Good,
        now: reviewCard.interval,
      })
    }).run()
  })

  test('preview new card', async ({ bench }) => {
    await bench('preview new card', () => {
      consumePreview(core.preview({ card: newCard, now: 0 }))
    }).run()
  })

  test('preview existing card', async ({ bench }) => {
    await bench('preview existing card', () => {
      consumePreview(
        core.preview({ card: reviewCard, now: reviewCard.interval })
      )
    }).run()
  })
})

describe('defineScheduler composition', () => {
  const cachedScheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  }).use(schedulerStatsMiddleware)
  cachedScheduler.create({ config })

  const cachedBaseScheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  })
  cachedBaseScheduler.create({ config })

  type RuntimeBranch = {
    use(...middlewares: (typeof schedulerStatsMiddleware)[]): RuntimeBranch
  }
  const runtimeBaseScheduler = cachedBaseScheduler as unknown as RuntimeBranch
  let deepScheduler = runtimeBaseScheduler
  for (let depth = 0; depth < 8; depth++) {
    deepScheduler = deepScheduler.use(schedulerStatsMiddleware)
  }

  test('use branch (base)', async ({ bench }) => {
    await bench('use branch (base)', () => {
      consumeScheduler(cachedBaseScheduler.use(schedulerStatsMiddleware))
    }).run()
  })

  test('use branch (8 ancestors)', async ({ bench }) => {
    await bench('use branch (8 ancestors)', () => {
      consumeScheduler(deepScheduler.use(schedulerStatsMiddleware))
    }).run()
  })

  test('use branch (4 added)', async ({ bench }) => {
    await bench('use branch (4 added)', () => {
      consumeScheduler(
        runtimeBaseScheduler.use(
          schedulerStatsMiddleware,
          schedulerStatsMiddleware,
          schedulerStatsMiddleware,
          schedulerStatsMiddleware
        )
      )
    }).run()
  })

  test('define/use (unmaterialized)', async ({ bench }) => {
    await bench('define/use (unmaterialized)', () => {
      consumeScheduler(
        defineScheduler({
          model: SM2Model,
          chrono: numericChrono,
        }).use(schedulerStatsMiddleware)
      )
    }).run()
  })

  test('define/use (name-only legacy workload)', async ({ bench }) => {
    await bench('define/use (name-only legacy workload)', () => {
      consumeScheduler(
        defineScheduler({
          model: SM2Model,
          chrono: numericChrono,
        }).use(schedulerStatsMiddleware).name
      )
    }).run()
  })

  test('define/use/create (cold)', async ({ bench }) => {
    await bench('define/use/create (cold)', () => {
      consumeScheduler(
        defineScheduler({
          model: SM2Model,
          chrono: numericChrono,
        })
          .use(schedulerStatsMiddleware)
          .create({ config })
      )
    }).run()
  })

  test('create (cached composition)', async ({ bench }) => {
    await bench('create (cached composition)', () => {
      consumeScheduler(cachedScheduler.create({ config }))
    }).run()
  })

  test('schema getter (cached)', async ({ bench }) => {
    await bench('schema getter (cached)', () => {
      consumeScheduler(cachedScheduler.schema)
    }).run()
  })

  test('defaultValue getter (cached)', async ({ bench }) => {
    await bench('defaultValue getter (cached)', () => {
      consumeScheduler(cachedScheduler.defaultValue)
    }).run()
  })

  test('schema getter (cold branch)', async ({ bench }) => {
    await bench('schema getter (cold branch)', () => {
      consumeScheduler(cachedBaseScheduler.use(schedulerStatsMiddleware).schema)
    }).run()
  })

  test('defaultValue getter (cold branch)', async ({ bench }) => {
    await bench('defaultValue getter (cold branch)', () => {
      consumeScheduler(
        cachedBaseScheduler.use(schedulerStatsMiddleware).defaultValue
      )
    }).run()
  })

  test('use/create branch (cached base)', async ({ bench }) => {
    await bench('use/create branch (cached base)', () => {
      consumeScheduler(
        cachedBaseScheduler.use(schedulerStatsMiddleware).create({ config })
      )
    }).run()
  })
})
