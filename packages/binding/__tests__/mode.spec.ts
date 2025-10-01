import {
  BindingMemoryState,
  FSRSBinding,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding'

describe('FSRS model', () => {
  test('model', () => {
    const f = new FSRSBinding()
    expect(f).toBeInstanceOf(FSRSBinding)
    const prototype = Object.getOwnPropertyDescriptors(f.constructor.prototype)
    console.log(prototype)

    expect(typeof f.nextStates).toBe('function')

    const review = new FSRSBindingReview(3, 1)
    expect(review).toBeInstanceOf(FSRSBindingReview)

    const item = new FSRSBindingItem([review])
    expect(item).toBeInstanceOf(FSRSBindingItem)
    expect(item.reviews.length).toBe(1)
    expect(item.reviews[0]).toBeInstanceOf(FSRSBindingReview)

    const memoryState = new BindingMemoryState(1.0, 0.5)
    expect(memoryState).toBeInstanceOf(BindingMemoryState)
  })

  test('next_states', () => {
    const f = new FSRSBinding()
    const nextStates = f.nextStates(null, 0.9, 0)
    expect(nextStates.again).not.toBeUndefined()
    expect(nextStates.hard).not.toBeUndefined()
    expect(nextStates.good).not.toBeUndefined()
    expect(nextStates.easy).not.toBeUndefined()
    console.log(nextStates)
  })
})
