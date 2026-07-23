import { bench, describe } from 'vitest'
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

  bench('create', () => {
    scheduler.create({ config })
  })

  bench('newCard', () => {
    core.newCard({ now: 0 })
  })

  bench('review new card', () => {
    core.review({ card: newCard, grade: Rating.Good, now: 0 })
  })

  bench('review existing card', () => {
    core.review({
      card: reviewCard,
      grade: Rating.Good,
      now: reviewCard.interval,
    })
  })

  bench('preview new card', () => {
    consumePreview(core.preview({ card: newCard, now: 0 }))
  })

  bench('preview existing card', () => {
    consumePreview(core.preview({ card: reviewCard, now: reviewCard.interval }))
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

  bench('use branch (base)', () => {
    consumeScheduler(cachedBaseScheduler.use(schedulerStatsMiddleware))
  })

  bench('use branch (8 ancestors)', () => {
    consumeScheduler(deepScheduler.use(schedulerStatsMiddleware))
  })

  bench('use branch (4 added)', () => {
    consumeScheduler(
      runtimeBaseScheduler.use(
        schedulerStatsMiddleware,
        schedulerStatsMiddleware,
        schedulerStatsMiddleware,
        schedulerStatsMiddleware
      )
    )
  })

  bench('define/use (unmaterialized)', () => {
    consumeScheduler(
      defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
      }).use(schedulerStatsMiddleware)
    )
  })

  bench('define/use (name-only legacy workload)', () => {
    consumeScheduler(
      defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
      }).use(schedulerStatsMiddleware).name
    )
  })

  bench('define/use/create (cold)', () => {
    consumeScheduler(
      defineScheduler({
        model: SM2Model,
        chrono: numericChrono,
      })
        .use(schedulerStatsMiddleware)
        .create({ config })
    )
  })

  bench('create (cached composition)', () => {
    consumeScheduler(cachedScheduler.create({ config }))
  })

  bench('schema getter (cached)', () => {
    consumeScheduler(cachedScheduler.schema)
  })

  bench('defaultValue getter (cached)', () => {
    consumeScheduler(cachedScheduler.defaultValue)
  })

  bench('schema getter (cold branch)', () => {
    consumeScheduler(cachedBaseScheduler.use(schedulerStatsMiddleware).schema)
  })

  bench('defaultValue getter (cold branch)', () => {
    consumeScheduler(
      cachedBaseScheduler.use(schedulerStatsMiddleware).defaultValue
    )
  })

  bench('use/create branch (cached base)', () => {
    consumeScheduler(
      cachedBaseScheduler.use(schedulerStatsMiddleware).create({ config })
    )
  })
})
