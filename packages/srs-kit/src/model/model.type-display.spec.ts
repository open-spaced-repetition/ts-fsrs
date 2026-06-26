/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, it } from 'vitest'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from './sm2.test.js'

// Type fixtures — names must be unique and appear before any expected-value
// strings so that quickInfoAt's indexOf hits the declaration first.
const modelSM2 = SM2Model
const coreSM2 = SM2Model.create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
const configSchemaSM2 = SM2Model.schema.config
const memoryStateSchemaSM2 = SM2Model.schema.memoryState

const SELF = 'src/model/model.type-display.spec.ts'

describe('defineModel type display', () => {
  const service = getTypeDisplayService()

  const expectedModels = {
    modelSM2: `const modelSM2: Model<{
    readonly name: "sm2";
    readonly config: SRSSchema<{
        input: {
            readonly weights: readonly number[];
        };
        output: {
            readonly weights: readonly number[];
        };
    }>;
    readonly memoryState: SRSSchema<{
        input: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
        };
        output: {
            readonly interval: number;
            readonly easeFactor: number;
            readonly reps: number;
        };
    }>;
}>`,
  }

  const expectedSchemas = {
    configSchemaSM2: `const configSchemaSM2: SRSSchema<{
    input: {
        readonly weights: readonly number[];
    };
    output: {
        readonly weights: readonly number[];
    };
}>`,
    memoryStateSchemaSM2: `const memoryStateSchemaSM2: SRSSchema<{
    input: {
        readonly interval: number;
        readonly easeFactor: number;
        readonly reps: number;
    };
    output: {
        readonly interval: number;
        readonly easeFactor: number;
        readonly reps: number;
    };
}>`,
  }

  const expectedCores = {
    coreSM2: `const coreSM2: ModelCore<{
    readonly config: {
        readonly weights: readonly number[];
    };
    readonly memoryState: {
        readonly interval: number;
        readonly easeFactor: number;
        readonly reps: number;
    };
}>`,
  }

  it('keeps model preset hovers readable', () => {
    for (const [marker, expected] of Object.entries(expectedModels)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('shows schema types for model schemas', () => {
    for (const [marker, expected] of Object.entries(expectedSchemas)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('shows ModelCore<T> for model.create()', () => {
    for (const [marker, expected] of Object.entries(expectedCores)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })
}, 20_000)
