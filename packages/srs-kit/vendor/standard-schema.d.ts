/**
 * source code: https://github.com/standard-schema/standard-schema
 * @license MIT
 */

// Vendored from Standard Schema v1, narrowed to synchronous validation.
export interface StandardTypedV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardTypedV1.Props<Input, Output>
}

export declare namespace StandardTypedV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly types?: Types<Input, Output> | undefined
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input
    readonly output: Output
  }

  export type InferInput<Schema extends StandardTypedV1> = NonNullable<
    Schema['~standard']['types']
  >['input']

  export type InferOutput<Schema extends StandardTypedV1> = NonNullable<
    Schema['~standard']['types']
  >['output']
}

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input>
    extends StandardTypedV1.Props<Input, Output> {
    readonly validate: (
      value: unknown,
      options?: StandardSchemaV1.Options | undefined
    ) => Result<Output>
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult

  export interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  export interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>
  }

  export interface Issue {
    readonly message: string
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  export interface PathSegment {
    readonly key: PropertyKey
  }

  export interface Types<Input = unknown, Output = Input>
    extends StandardTypedV1.Types<Input, Output> {}

  export type InferInput<Schema extends StandardTypedV1> =
    StandardTypedV1.InferInput<Schema>

  export type InferOutput<Schema extends StandardTypedV1> =
    StandardTypedV1.InferOutput<Schema>
}
