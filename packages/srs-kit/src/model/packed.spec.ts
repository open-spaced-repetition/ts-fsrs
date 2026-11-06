import { expect, expectTypeOf, it } from 'vitest'
import { defineModel } from './model.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from './sm2.test.js'

it('infers a packed forward result without a decoder', () => {
  const output = new Float64Array([1, 2.5, 3])
  const model = defineModel({
    name: 'packed',
    schema: SM2Model.schema,
    defaultValue: SM2Model.defaultValue,
    create(options) {
      return { ...SM2Model.create(options), forward: () => output }
    },
  })
  const core = model.create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
  const states = core.forward({ history: [] })
  expectTypeOf(states).toEqualTypeOf<Float64Array>()
  expect(states).toBe(output)
})
