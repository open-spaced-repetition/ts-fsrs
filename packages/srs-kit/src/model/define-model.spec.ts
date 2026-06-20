import type { StandardSchemaV1 } from '@standard-schema/spec'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { type Grade, Rating } from '../primitives/index.js'
import type { SchemaOutput } from '../schema/index.js'
import { validateSchema } from '../schema/index.js'
import { defineModel } from './define-model.js'
import type { IModel, ModelBounds, ModelName, ModelStepInput } from './types.js'

interface TestConfig {
  readonly initialStability: number
}

interface TestMemory {
  readonly stability: number
}

const configSchema: StandardSchemaV1<TestConfig, TestConfig> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate(value) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'initialStability' in value &&
        typeof value.initialStability === 'number'
      ) {
        return { value: { initialStability: value.initialStability } }
      }

      return { issues: [{ message: 'Expected config' }] }
    },
  },
}

const memorySchema: StandardSchemaV1<TestMemory, TestMemory> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate(value) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'stability' in value &&
        typeof value.stability === 'number'
      ) {
        return { value: { stability: value.stability } }
      }

      return { issues: [{ message: 'Expected memory' }] }
    },
  },
}

describe('defineModel', () => {
  it('keeps model definition types and runtime behavior intact', async () => {
    const modelName = Symbol('test-model')
    const model = defineModel({
      name: modelName,
      schema: {
        config: configSchema,
        memoryState: {
          schema: memorySchema,
          default() {
            return { stability: 0 }
          },
        },
      },
      create(_context) {
        return {
          bounds: {
            stabilityMin: 0,
            stabilityMax: 36500,
          },
          step(input) {
            expectTypeOf(input).toEqualTypeOf<ModelStepInput<TestMemory>>()
            expectTypeOf(input.rating).toEqualTypeOf<Grade>()
            expectTypeOf(input.retrievability).toEqualTypeOf<
              number | undefined
            >()
            return {
              stability:
                (input.memoryState?.stability ?? 0) +
                input.elapsedDays +
                (input.retrievability ?? 0) +
                (input.rating === Rating.Easy ? 2 : 1),
            }
          },
          nextInterval(memory, desiredRetention) {
            return Math.ceil(memory.stability * desiredRetention)
          },
          forgettingCurve(memory, elapsedDays) {
            return memory.stability / (memory.stability + elapsedDays)
          },
          forward(input) {
            let memory = input.initialState ?? null
            return input.history.map((review) => {
              memory = this.step({
                memoryState: memory,
                rating: review.rating,
                elapsedDays: review.deltaT,
              })
              return memory
            })
          },
        } satisfies IModel<TestMemory>
      },
    })

    expect(model.name).toBe(modelName)
    expectTypeOf(model.name).toEqualTypeOf<ModelName>()
    expectTypeOf<
      SchemaOutput<typeof model.schema.config>
    >().toEqualTypeOf<TestConfig>()
    expectTypeOf<ModelBounds<TestMemory>>().toEqualTypeOf<{
      readonly stabilityMin: number
      readonly stabilityMax: number
    }>()
    expectTypeOf<Awaited<ReturnType<typeof model.create>>['bounds']>().toExtend<
      ModelBounds<TestMemory>
    >()

    const config = await validateSchema(model.schema.config, {
      initialStability: 3,
    })
    const runtime = await model.create({ config })
    const memory = await validateSchema(
      model.schema.memoryState.schema,
      await model.schema.memoryState.default({ config })
    )

    expect(memory).toEqual({ stability: 0 })
    expect(
      runtime.step({
        memoryState: memory,
        rating: Rating.Easy,
        elapsedDays: 4,
        retrievability: 0.5,
      })
    ).toEqual({ stability: 6.5 })
    expect(runtime.nextInterval(memory, 0.9)).toBe(0)
    expect(runtime.forgettingCurve(memory, 3)).toBe(0)
    expect(
      runtime.forward({
        initialState: memory,
        history: [
          { rating: Rating.Good, deltaT: 1 },
          { rating: Rating.Easy, deltaT: 2 },
        ],
      })
    ).toEqual([{ stability: 2 }, { stability: 6 }])
  })
})
