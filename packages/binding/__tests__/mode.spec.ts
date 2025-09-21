import {
  FSRS,
  FSRSItem,
  FSRSReview,
  MemoryState,
} from '@open-spaced-repetition/binding'

describe('FSRS model', () => {
  test('model', () => {
    const f = new FSRS()
    expect(f).toBeInstanceOf(FSRS)
    const prototype = Object.getOwnPropertyDescriptors(f.constructor.prototype)
    console.log(prototype)

    expect(typeof f.nextStates).toBe('function')

    const review = new FSRSReview(3, 1)
    expect(review).toBeInstanceOf(FSRSReview)

    const item = new FSRSItem([review])
    expect(item).toBeInstanceOf(FSRSItem)
    expect(item.reviews.length).toBe(1)
    expect(item.reviews[0]).toBeInstanceOf(FSRSReview)

    const memoryState = new MemoryState(1.0, 0.5)
    expect(memoryState).toBeInstanceOf(MemoryState)
  })

  test('next_states', () => {
    const f = new FSRS()
    const nextStates = f.nextStates(null, 0.9, 0)
    expect(nextStates.again).not.toBeUndefined()
    expect(nextStates.hard).not.toBeUndefined()
    expect(nextStates.good).not.toBeUndefined()
    expect(nextStates.easy).not.toBeUndefined()
    console.log(nextStates)
  })
})
