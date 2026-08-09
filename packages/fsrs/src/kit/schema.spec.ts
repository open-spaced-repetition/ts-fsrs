import { describe, expect, it } from 'vitest'
import { FSRSMemoryStateSchema } from './schema.js'
import { isNumberArray } from './schema-utils.js'

describe('FSRS schemas', () => {
  it('rejects an invalid memory state', () => {
    expect(() =>
      FSRSMemoryStateSchema.parse({ stability: '1', difficulty: 2 })
    ).toThrow('Expected FSRS memory state')
  })

  it('rejects non-number and non-finite array items', () => {
    expect(isNumberArray(['1'])).toBe(false)
    expect(isNumberArray([Number.NaN])).toBe(false)
  })
})
