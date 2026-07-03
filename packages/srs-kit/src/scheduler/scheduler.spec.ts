import { describe, expect, expectTypeOf, it } from 'vitest'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { type Grade, Rating, type State } from '@/primitives/index.js'
import type {
  SchedulerCardOf,
  SchedulerConfigOf,
  SchedulerRevlogOf,
  SchedulerStatusOf,
  SchedulerTimeOf,
} from './infer.js'
import {
  config,
  createSM2NumericScheduler,
  sourceMiddleware,
  statusMiddleware,
} from './scheduler.test.js'

const scheduler = createSM2NumericScheduler().use(schedulerStatsMiddleware)
const core = scheduler.create({ config })
const middlewareScheduler = createSM2NumericScheduler().use(
  sourceMiddleware,
  schedulerStatsMiddleware
)
const usedScheduler = createSM2NumericScheduler().use(
  sourceMiddleware,
  schedulerStatsMiddleware
)
const chainedScheduler = createSM2NumericScheduler()
  .use(sourceMiddleware)
  .use(schedulerStatsMiddleware)
const statusScheduler = createSM2NumericScheduler().use(statusMiddleware)

const usedCore = usedScheduler.create({
  config: {
    ...config,
    source: 'used-source',
  },
})

describe('defineScheduler', () => {
  it('preserves model name', () => {
    expect(scheduler.name).toBe('sm2')
    expectTypeOf(scheduler.name).toEqualTypeOf<'sm2'>()
  })

  it('exposes composed schemas', () => {
    expect(scheduler.schema.config).toBeDefined()
    expect(scheduler.schema.card).toBeDefined()
    expect(scheduler.schema.revlog).toBeDefined()
  })

  it('uses middleware references from use() when schemas parse', () => {
    const dynamicScheduler = createSM2NumericScheduler()
    const schema = dynamicScheduler.schema

    const dynamicSchedulerWithMiddleware = dynamicScheduler.use(
      sourceMiddleware,
      schedulerStatsMiddleware
    )
    const usedSchema = dynamicSchedulerWithMiddleware.schema

    expect(dynamicSchedulerWithMiddleware).toBe(dynamicScheduler)
    expect(usedSchema).toBe(schema)
    expect(() => usedSchema.card.parse(core.newCard())).toThrow(
      'Expected source card field'
    )
    expect(() =>
      usedSchema.revlog.parse({
        ...core.newCard(),
        rating: Rating.Good,
      })
    ).toThrow('Expected audit revlog field')

    expect(
      usedSchema.config.parse({
        ...config,
        source: 'schema-source',
      }).source
    ).toBe('schema-source')
    expect(usedSchema.card.parse(usedCore.newCard()).source).toBe('used-source')
    expect(
      usedSchema.revlog.parse({
        ...usedCore.newCard(),
        rating: Rating.Good,
        audit: 'schema-source',
      }).audit
    ).toBe('schema-source')
  })

  it('infers composed config type', () => {
    expectTypeOf<SchedulerConfigOf<typeof scheduler>>().toEqualTypeOf<{
      readonly weights: readonly number[]
      readonly chrono: Record<string, never>
    }>()
  })

  it('infers middleware config type', () => {
    expectTypeOf<
      SchedulerConfigOf<typeof middlewareScheduler>
    >().toEqualTypeOf<{
      readonly weights: readonly number[]
      readonly chrono: Record<string, never>
      readonly source: string
    }>()
  })

  it('preserves middleware config type through use()', () => {
    expectTypeOf<SchedulerConfigOf<typeof usedScheduler>>().toEqualTypeOf<{
      readonly weights: readonly number[]
      readonly chrono: Record<string, never>
      readonly source: string
    }>()
  })

  it('preserves prior config type through chained use()', () => {
    expectTypeOf<SchedulerConfigOf<typeof chainedScheduler>>().toEqualTypeOf<{
      readonly weights: readonly number[]
      readonly chrono: Record<string, never>
      readonly source: string
    }>()
  })

  it('infers composed card type with flattened model fields', () => {
    expectTypeOf<SchedulerCardOf<typeof scheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly state: State
      readonly lapses: number
    }>()
  })

  it('infers middleware card fields', () => {
    expectTypeOf<SchedulerCardOf<typeof middlewareScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly state: State
      readonly lapses: number
      readonly source: string
    }>()
  })

  it('preserves middleware card fields through use()', () => {
    expectTypeOf<SchedulerCardOf<typeof usedScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly state: State
      readonly lapses: number
      readonly source: string
    }>()
  })

  it('preserves prior card fields through chained use()', () => {
    expectTypeOf<SchedulerCardOf<typeof chainedScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly source: string
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly state: State
      readonly lapses: number
    }>()
  })

  it('infers composed revlog type with flattened model fields', () => {
    expectTypeOf<SchedulerRevlogOf<typeof scheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly rating: 1 | 2 | 3 | 4
      readonly state: State
    }>()
  })

  it('infers middleware revlog fields', () => {
    expectTypeOf<
      SchedulerRevlogOf<typeof middlewareScheduler>
    >().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly rating: 1 | 2 | 3 | 4
      readonly state: State
      readonly audit: string
    }>()
  })

  it('preserves middleware revlog fields through use()', () => {
    expectTypeOf<SchedulerRevlogOf<typeof usedScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly rating: 1 | 2 | 3 | 4
      readonly state: State
      readonly audit: string
    }>()
  })

  it('preserves prior revlog fields through chained use()', () => {
    expectTypeOf<SchedulerRevlogOf<typeof chainedScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly audit: string
      readonly scheduleStatus: 'new' | 'learning' | 'review'
      readonly rating: 1 | 2 | 3 | 4
      readonly state: State
    }>()
  })

  it('infers time type from chrono', () => {
    expectTypeOf<SchedulerTimeOf<typeof scheduler>>().toEqualTypeOf<number>()
  })

  it('infers default scheduler status type', () => {
    expectTypeOf<SchedulerStatusOf<typeof scheduler>>().toEqualTypeOf<
      'new' | 'learning' | 'review'
    >()
  })

  it('extends scheduler status via use()', () => {
    expectTypeOf<SchedulerStatusOf<typeof statusScheduler>>().toEqualTypeOf<
      'new' | 'learning' | 'review' | 'suspend' | 'buried'
    >()
  })

  it('validates scheduleStatus against default and middleware keys', () => {
    const card = core.newCard()

    expect(scheduler.schema.scheduleStatus.parse('new')).toBe('new')
    expect(() => scheduler.schema.scheduleStatus.parse('suspend')).toThrow(
      'Expected known scheduleStatus'
    )
    expect(statusScheduler.schema.scheduleStatus.parse('suspend')).toBe(
      'suspend'
    )
    expect(() => statusScheduler.schema.scheduleStatus.parse('typo')).toThrow(
      'Expected known scheduleStatus'
    )

    expect(() =>
      scheduler.schema.card.parse({
        ...card,
        scheduleStatus: 'suspend',
      })
    ).toThrow('Expected known scheduleStatus')
    expect(
      statusScheduler.schema.card.parse({
        ...card,
        scheduleStatus: 'suspend',
      }).scheduleStatus
    ).toBe('suspend')
    expect(() =>
      statusScheduler.schema.card.parse({
        ...card,
        scheduleStatus: 'typo',
      })
    ).toThrow('Expected known scheduleStatus')
    expect(
      statusScheduler.schema.revlog.parse({
        ...card,
        rating: Rating.Good,
        scheduleStatus: 'buried',
      }).scheduleStatus
    ).toBe('buried')
  })

  it('extends card and revlog schedule status via use()', () => {
    type ExtendedStatus = 'new' | 'learning' | 'review' | 'suspend' | 'buried'

    expectTypeOf<SchedulerCardOf<typeof statusScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly state: State
      readonly scheduleStatus: ExtendedStatus
    }>()
    expectTypeOf<SchedulerRevlogOf<typeof statusScheduler>>().toEqualTypeOf<{
      readonly interval: number
      readonly easeFactor: number
      readonly reps: number
      readonly scheduleStatus: ExtendedStatus
      readonly rating: Grade
      readonly state: State
    }>()
  })
})
