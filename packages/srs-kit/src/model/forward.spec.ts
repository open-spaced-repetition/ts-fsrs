import { describe, expect, expectTypeOf, it } from 'vitest'
import type { ModelForwardOf, ModelMemoryOf } from './infer.js'
import type {
  AnyModel,
  AnyModelCore,
  Model,
  ModelBounds,
  ModelCore,
  ModelForwardInput,
  ModelStepInput,
} from './model.js'
import { defineModel } from './model.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model, type SM2State } from './sm2.test.js'

interface PackedStates {
  readonly stride: number
  readonly values: readonly number[]
}

// A second copy of ModelCore, as bundled into another package's declarations.
interface ForeignModelCore<MemoryState extends object, ForwardResult> {
  readonly config: unknown
  readonly bounds: ModelBounds<MemoryState>
  readonly algorithm: unknown
  readonly step: (input: ModelStepInput<MemoryState>) => MemoryState
  readonly nextInterval: (
    memoryState: Readonly<MemoryState>,
    desiredRetention: number
  ) => number
  readonly forgettingCurve: (
    memoryState: Readonly<MemoryState>,
    elapsedDays: number
  ) => number
  readonly forward: (input: ModelForwardInput<MemoryState>) => ForwardResult
}

describe('ModelCore forward result', () => {
  it('defaults to one memory state per review', () => {
    const core = SM2Model.create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
    expectTypeOf(core.forward({ history: [] })).toEqualTypeOf<
      readonly SM2State[]
    >()
    expectTypeOf<ModelForwardOf<typeof SM2Model>>().toEqualTypeOf<
      readonly ModelMemoryOf<typeof SM2Model>[]
    >()
    expectTypeOf<ReturnType<AnyModelCore['forward']>>().toEqualTypeOf<
      // biome-ignore lint/suspicious/noExplicitAny: AnyModelCore must stay any[]
      readonly any[]
    >()
    expectTypeOf<
      ReturnType<ReturnType<AnyModel['create']>['forward']>
    >().toEqualTypeOf<
      // biome-ignore lint/suspicious/noExplicitAny: AnyModel must stay any[]
      readonly any[]
    >()
    expectTypeOf<
      ReturnType<
        ModelCore<{ memoryState: SM2State; algorithm: null }>['forward']
      >
    >().toEqualTypeOf<readonly SM2State[]>()
  })

  it('infers a custom forward result from create', () => {
    const output: PackedStates = { stride: 3, values: [1, 2.5, 0] }
    const model = defineModel({
      name: 'custom-forward',
      schema: SM2Model.schema,
      defaultValue: SM2Model.defaultValue,
      create(options) {
        return { ...SM2Model.create(options), forward: () => output }
      },
    })
    const core = model.create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
    const states = core.forward({ history: [] })

    expectTypeOf(states).toEqualTypeOf<PackedStates>()
    expectTypeOf<ModelForwardOf<typeof model>>().toEqualTypeOf<PackedStates>()
    expectTypeOf<ModelMemoryOf<typeof model>>().toEqualTypeOf<SM2State>()
    expectTypeOf(core.step).returns.toEqualTypeOf<SM2State>()
    expect(states).toBe(output)
  })

  it('reads a forward result declared on the model env', () => {
    type Declared = Model<{
      name: 'declared'
      config: (typeof SM2Model)['schema']['config']
      memoryState: (typeof SM2Model)['schema']['memoryState']
      algorithm: null
      forwardResult: PackedStates
    }>
    expectTypeOf<ModelForwardOf<Declared>>().toEqualTypeOf<PackedStates>()
    expectTypeOf<ModelMemoryOf<Declared>>().toEqualTypeOf<SM2State>()
  })

  it('keeps packed forward results within one declaration copy', () => {
    expectTypeOf<
      ForeignModelCore<SM2State, readonly SM2State[]>
    >().toExtend<AnyModelCore>()
    expectTypeOf<
      ForeignModelCore<SM2State, Float64Array>
    >().not.toExtend<AnyModelCore>()
  })
})
