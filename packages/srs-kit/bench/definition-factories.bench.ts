import { bench, describe } from 'vitest'
import { defineChrono } from '@/chrono/define-chrono.js'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { defineMiddleware } from '@/middleware/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { defineModel } from '@/model/model.js'
import { defineScheduler } from '@/scheduler/index.js'

let benchmarkSink: unknown

function consume<T>(value: T): void {
  benchmarkSink = value
}

const middlewareDefinition = {
  name: Symbol('definition-benchmark-middleware'),
} as const

const chronoDefinition = numericChrono
const modelDefinition = SM2Model
const schedulerDefinition = {
  model: modelDefinition,
  chrono: chronoDefinition,
} as const

function createScheduler() {
  return defineScheduler(schedulerDefinition).create({
    config: { weights: SM2_DEFAULT_WEIGHTS },
  })
}

const composedSchedulers = [
  {
    label: 'base',
    scheduler: defineScheduler(schedulerDefinition),
  },
  {
    label: 'one middleware',
    scheduler: defineScheduler(schedulerDefinition).use(
      defineMiddleware(middlewareDefinition)
    ),
  },
] as const

describe('definition factories', () => {
  bench('defineMiddleware name-only definition', () => {
    consume(defineMiddleware(middlewareDefinition))
  })

  bench('defineChrono numeric definition', () => {
    consume(defineChrono(chronoDefinition))
  })

  bench('defineModel SM2 definition', () => {
    consume(defineModel(modelDefinition))
  })

  bench('defineScheduler base definition', () => {
    consume(defineScheduler(schedulerDefinition))
  })

  bench('defineScheduler plus middleware', () => {
    consume(
      defineScheduler(schedulerDefinition).use(
        defineMiddleware(middlewareDefinition)
      )
    )
  })

  bench('defineScheduler create', () => {
    consume(createScheduler())
  })
})

for (const { label, scheduler } of composedSchedulers) {
  describe(`composed scheduler (${label})`, () => {
    bench('schema getter', () => {
      consume(scheduler.schema)
    })

    bench('defaultValue getter', () => {
      consume(scheduler.defaultValue)
    })
  })
}
