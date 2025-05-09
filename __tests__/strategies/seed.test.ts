import {
  AbstractScheduler,
  Card,
  createEmptyCard,
  DefaultInitSeedStrategy,
  fsrs,
  GenSeedStrategyWithCardId,
  Rating,
  StrategyMode,
} from '../../src/fsrs'

interface ICard extends Card {
  card_id: number
}

describe('seed strategy', () => {
  it('default seed strategy', () => {
    const seedStrategy = DefaultInitSeedStrategy
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now, (card: Card) => {
      Object.assign(card, { card_id: 555 })
      return card as ICard
    })

    const record = f.repeat(card, now)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])
    const scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed = seedStrategy.bind(scheduler)()
    console.debug('seed', seed)

    expect(f['_seed']).toBe(seed)
  })
})

describe('seed strategy with card ID', () => {
  it('use seedStrategy', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)

    expect(f['strategyHandler'].get(StrategyMode.SEED)).toBe(seedStrategy)

    f.clearStrategy()
    expect(f['strategyHandler'].get(StrategyMode.SEED)).toBeUndefined()
  })
  it('clear seedStrategy', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now, (card: Card) => {
      Object.assign(card, { card_id: 555 })
      return card as ICard
    })

    f.repeat(card, now)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])

    let scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed_with_card_id = seedStrategy.bind(scheduler)()
    console.debug('seed with card_id=555', seed_with_card_id)

    f.clearStrategy(StrategyMode.SEED)

    f.repeat(card, now)

    scheduler = new f['Scheduler'](
      card,
      now,
      f,
      new Map([[StrategyMode.SEED, DefaultInitSeedStrategy]])
    ) as AbstractScheduler
    const basic_seed = DefaultInitSeedStrategy.bind(scheduler)()
    console.debug('basic_seed with card_id=555', basic_seed)

    expect(f['_seed']).toBe(basic_seed)

    expect(seed_with_card_id).not.toBe(basic_seed)
  })

  it('exist card_id', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now, (card: Card) => {
      Object.assign(card, { card_id: 555 })
      return card as ICard
    })

    const record = f.repeat(card, now)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])
    const scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed = seedStrategy.bind(scheduler)()
    console.debug('seed with card_id=555', seed)

    expect(f['_seed']).toBe(seed)
  })

  it('not exist card_id', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now)

    const record = f.repeat(card, now)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])
    const scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed = seedStrategy.bind(scheduler)()
    console.debug('seed with card_id=undefined(default)', seed)

    expect(f['_seed']).toBe(seed)
  })

  it('card_id = -1', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now, (card: Card) => {
      Object.assign(card, { card_id: -1 })
      return card as ICard
    })

    const record = f.repeat(card, now)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])
    const scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed = seedStrategy.bind(scheduler)()
    console.debug('with card_id=-1', seed)

    expect(f['_seed']).toBe(seed)
    expect(f['_seed']).toBe('0')
  })

  it('card_id is undefined', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now, (card: Card) => {
      Object.assign(card, { card_id: undefined })
      return card as ICard
    })

    const item = f.next(card, now, Rating.Good)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])
    const scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed = seedStrategy.bind(scheduler)()
    console.debug('seed with card_id=undefined', seed)

    expect(f['_seed']).toBe(seed)
    expect(f['_seed']).toBe(`${item.card.reps}`)
  })

  it('card_id is null', () => {
    const seedStrategy = GenSeedStrategyWithCardId('card_id')
    const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
    const now = Date.UTC(2022, 11, 29, 12, 30, 0, 0)

    const card = createEmptyCard<ICard>(now, (card: Card) => {
      Object.assign(card, { card_id: null })
      return card as ICard
    })

    const item = f.next(card, now, Rating.Good)
    const strategies = new Map([[StrategyMode.SEED, seedStrategy]])
    const scheduler = new f['Scheduler'](
      card,
      now,
      f,
      strategies
    ) as AbstractScheduler

    const seed = seedStrategy.bind(scheduler)()
    console.debug('seed with card_id=null', seed)

    expect(f['_seed']).toBe(seed)
    expect(f['_seed']).toBe(`${item.card.reps}`)
  })
})
