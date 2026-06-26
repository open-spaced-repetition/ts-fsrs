import { bench, describe } from 'vitest'
import { defineChrono, defineChronoProjection } from '@/chrono/index.js'
import { dateChrono } from '@/chrono/presets/date/index.js'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { temporalInstantChrono } from '@/chrono/presets/temporal-instant/index.js'
import { numberSchema } from '@/schema/index.js'

const NS_PER_DAY = 86_400_000_000_000n
const nodeMajor = Number(process.versions.node.split('.')[0])
const requestedTemporalImplementation =
  process.env.SRS_KIT_TEMPORAL_IMPLEMENTATION
const temporalImplementation =
  requestedTemporalImplementation ?? (nodeMajor >= 26 ? 'native' : 'polyfill')

function setTemporal(temporal: typeof Temporal): void {
  Object.defineProperty(globalThis, 'Temporal', {
    configurable: true,
    value: temporal,
  })
}

if (temporalImplementation === 'polyfill') {
  const { Temporal: PolyfillTemporal } = await import('temporal-polyfill')
  setTemporal(PolyfillTemporal as typeof Temporal)
} else if (requestedTemporalImplementation === 'native' && nodeMajor < 26) {
  throw new Error(
    'Native Temporal benchmarks require Node.js 26 or newer. Use SRS_KIT_TEMPORAL_IMPLEMENTATION=polyfill for the polyfill path.'
  )
}

const activeTemporal = globalThis.Temporal

function createInstant(
  temporal: typeof Temporal,
  epochNanoseconds: bigint
): Temporal.Instant {
  return temporal.Instant.fromEpochNanoseconds(epochNanoseconds)
}

const numericProjection = defineChronoProjection<{
  readonly time: number
}>((value) => {
  const time = numberSchema['~standard'].validate(value.time)
  if (time.issues) {
    return time
  }

  return { value: { previous: 0, current: time.value } }
})

describe('defineChrono', () => {
  bench('defineChrono with schema projection', () => {
    defineChrono({
      schema: {
        time: numberSchema,
      },
      projection: numericProjection,
      create() {
        return {
          now: () => 0,
          difference: (from: number, to: number) => to - from,
          add: (from: number, days: number) => from + days,
        }
      },
    })
  })

  bench('defineChrono with function projection', () => {
    defineChrono({
      schema: {
        time: numberSchema,
      },
      projection(value) {
        const time = numberSchema['~standard'].validate(value.time)
        if (time.issues) {
          return time
        }

        return { value: { previous: 0, current: time.value } }
      },
      create() {
        return {
          now: () => 0,
          difference: (from: number, to: number) => to - from,
          add: (from: number, days: number) => from + days,
        }
      },
    })
  })

  bench('defineChronoProjection', () => {
    defineChronoProjection<{ readonly time: number }>((value) => {
      const time = numberSchema['~standard'].validate(value.time)
      if (time.issues) {
        return time
      }

      return { value: { previous: 0, current: time.value } }
    })
  })
})

describe('numericChrono preset', () => {
  const core = numericChrono.create()

  bench('create', () => {
    numericChrono.create()
  })
  bench('now', () => {
    core.now()
  })
  bench('projection', () => {
    numericChrono.projection['~standard'].validate({ time: 4.5 })
  })
  bench('difference', () => {
    core.difference(1.25, 4.75)
  })
  bench('add', () => {
    core.add(1.25, 3.5)
  })
})

describe('dateChrono preset', () => {
  const now = new Date('2026-06-20T00:00:00.000Z')
  const later = new Date('2026-06-21T12:00:00.000Z')
  const core = dateChrono.create()
  const card = { dueAt: now, lastReviewAt: now }
  const previous = { previous: now, current: later }

  bench('create', () => {
    dateChrono.create()
  })
  bench('now', () => {
    core.now()
  })
  bench('projection', () => {
    dateChrono.projection['~standard'].validate({ card, time: later })
  })
  bench('default card', () => {
    dateChrono.defaultValue.card?.({ config: {}, previous, time: now })
  })
  bench('default revlog', () => {
    dateChrono.defaultValue.revlog?.({ config: {}, previous, time: now })
  })
  bench('difference', () => {
    core.difference(now, later)
  })
  bench('add', () => {
    core.add(now, 2.25)
  })
})

function describeTemporalInstant(
  label: string,
  temporal: typeof Temporal | undefined
): void {
  if (!temporal) {
    describe.skip(`temporalInstantChrono preset (${label})`)
    return
  }

  describe(`temporalInstantChrono preset (${label})`, () => {
    const now = createInstant(temporal, 0n)
    const later = createInstant(temporal, (NS_PER_DAY * 3n) / 2n)
    const rawConfig = { timezone: 'Asia/Shanghai' }
    const rawUtcConfig = { timezone: 'UTC' }
    const rawOffsetConfig = { timezone: '+09:00' }
    const config = temporalInstantChrono.schema.config.parse(rawConfig)
    const core = temporalInstantChrono.create({ config })
    const fractionalCore = temporalInstantChrono.create({
      config: { ...config, fractionalDays: true },
    })
    const utcConfig = temporalInstantChrono.schema.config.parse(rawUtcConfig)
    const utcCore = temporalInstantChrono.create({ config: utcConfig })
    const card = { dueAt: now, lastReviewAt: now }
    const previous = { previous: now, current: later }

    bench('create', () => {
      temporalInstantChrono.create({ config })
    })
    bench('parse config', () => {
      temporalInstantChrono.schema.config.parse(rawConfig)
    })
    bench('parse config UTC', () => {
      temporalInstantChrono.schema.config.parse(rawUtcConfig)
    })
    bench('parse config offset', () => {
      temporalInstantChrono.schema.config.parse(rawOffsetConfig)
    })
    bench('now', () => {
      core.now()
    })
    bench('projection', () => {
      temporalInstantChrono.projection['~standard'].validate({
        card,
        time: later,
      })
    })
    bench('default card', () => {
      temporalInstantChrono.defaultValue.card?.({
        config,
        previous,
        time: now,
      })
    })
    bench('default revlog', () => {
      temporalInstantChrono.defaultValue.revlog?.({
        config,
        previous,
        time: now,
      })
    })
    bench('difference', () => {
      core.difference(now, later)
    })
    bench('fractional difference', () => {
      fractionalCore.difference(now, later)
    })
    bench('add whole days', () => {
      core.add(now, 2)
    })
    bench('add fractional days', () => {
      core.add(now, 2.25)
    })
    bench('difference UTC', () => {
      utcCore.difference(now, later)
    })
    bench('add whole days UTC', () => {
      utcCore.add(now, 2)
    })
    bench('add fractional days UTC', () => {
      utcCore.add(now, 2.25)
    })
  })
}

describeTemporalInstant(temporalImplementation, activeTemporal)
