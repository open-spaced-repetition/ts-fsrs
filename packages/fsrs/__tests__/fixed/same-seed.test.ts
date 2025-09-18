import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

describe('fuzz same seed', () => {
  const MOCK_NOW = new Date(2024, 7, 15)
  const size = 100

  // https://github.com/open-spaced-repetition/ts-fsrs/issues/113
  it('should be the same[short-term]', () => {
    const { card } = fsrs().next(createEmptyCard(), MOCK_NOW, Rating.Good)
    const scheduler = fsrs({ enable_fuzz: true })
    const MOCK_TOMORROW = new Date(2024, 7, 16)

    const timestamp: number[] = []
    for (let count = 0; count < size; count++) {
      setTimeout(() => {
        const _card = scheduler.next(card, MOCK_TOMORROW, Rating.Good).card
        timestamp.push(_card.due.getTime())
        if (timestamp.length === size) {
          expect(timestamp.every((value) => value === timestamp[0])).toBe(true)
        }
      }, 50)
    }
  })

  it('should be the same[long-term]', () => {
    const { card } = fsrs({ enable_short_term: false }).next(
      createEmptyCard(),
      MOCK_NOW,
      Rating.Good
    )
    const scheduler = fsrs({ enable_fuzz: true, enable_short_term: false })
    const MOCK_TOMORROW = new Date(2024, 7, 18)

    const timestamp: number[] = []
    for (let count = 0; count < size; count++) {
      setTimeout(() => {
        const _card = scheduler.next(card, MOCK_TOMORROW, Rating.Good).card
        timestamp.push(_card.due.getTime())
        if (timestamp.length === size) {
          expect(timestamp.every((value) => value === timestamp[0])).toBe(true)
        }
      }, 50)
    }
  })
})
