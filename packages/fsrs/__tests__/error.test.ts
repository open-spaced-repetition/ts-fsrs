import * as fsrsExports from 'ts-fsrs'
import {
  checkParameters,
  createEmptyCard,
  fsrs,
  type Grade,
  generatorParameters,
  Rating,
  TypeConvert,
} from 'ts-fsrs'
import {
  FSRSError,
  FSRSOperationError,
  FSRSValidationError,
} from '../src/error.js'

const captureThrownError = (action: () => unknown): unknown => {
  try {
    action()
  } catch (error) {
    return error
  }
  throw new Error('Expected action to throw')
}

const expectFSRSError = (
  action: () => unknown,
  message: string | RegExp,
  ErrorClass: typeof FSRSError = FSRSError
): FSRSError => {
  const error = captureThrownError(action)
  expect(error).toBeInstanceOf(ErrorClass)
  expect(error).toBeInstanceOf(FSRSError)
  expect(error).toBeInstanceOf(Error)

  const fsrsError = error as FSRSError
  if (typeof message === 'string') {
    expect(fsrsError.message).toBe(message)
  } else {
    expect(fsrsError.message).toMatch(message)
  }
  return fsrsError
}

describe('FSRSError', () => {
  test('does not expose the error API from the root entrypoint', () => {
    expect('FSRSError' in fsrsExports).toBe(false)
    expect('FSRSValidationError' in fsrsExports).toBe(false)
    expect('FSRSOperationError' in fsrsExports).toBe(false)
  })

  test('keeps the native Error shape', () => {
    const error = new FSRSError('Invalid value')

    expect(error).toBeInstanceOf(FSRSError)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('FSRSError')
    expect(error.message).toBe('Invalid value')
  })

  test('specific error classes inherit from FSRSError', () => {
    const validationError = new FSRSValidationError('Invalid value')
    const operationError = new FSRSOperationError('Invalid operation')

    expect(validationError).toBeInstanceOf(FSRSValidationError)
    expect(validationError).toBeInstanceOf(FSRSError)
    expect(validationError.name).toBe('FSRSValidationError')
    expect(validationError.message).toBe('Invalid value')

    expect(operationError).toBeInstanceOf(FSRSOperationError)
    expect(operationError).toBeInstanceOf(FSRSError)
    expect(operationError.name).toBe('FSRSOperationError')
    expect(operationError.message).toBe('Invalid operation')
  })

  test('uses the default message', () => {
    const error = new FSRSError()

    expect(error.message).toBe('FSRS Error')
  })

  test('wraps invalid input errors', () => {
    expectFSRSError(
      () => TypeConvert.time('invalid-date'),
      'Invalid date:[invalid-date]',
      FSRSValidationError
    )
  })

  test('wraps validation failures', () => {
    expectFSRSError(
      () => checkParameters([0.40255]),
      /^Invalid parameter length/,
      FSRSValidationError
    )
  })

  test('wraps invalid memory state errors', () => {
    const model = fsrs(generatorParameters()).model

    expectFSRSError(
      () =>
        model.step({
          memoryState: {
            difficulty: 0.5,
            stability: 0,
          },
          elapsedDays: 0,
          rating: Rating.Good,
        }),
      'Invalid memory state { difficulty: 0.5, stability: 0 }',
      FSRSValidationError
    )
  })

  test('wraps invalid operation errors', () => {
    expectFSRSError(
      () =>
        fsrs().next(
          createEmptyCard(),
          new Date(),
          Rating.Manual as unknown as Grade
        ),
      'Cannot review a manual rating',
      FSRSValidationError
    )
  })

  test('captures stack from the business throw site', () => {
    const error = expectFSRSError(
      () => TypeConvert.time('invalid-date'),
      'Invalid date:[invalid-date]',
      FSRSValidationError
    )
    const firstFrame = error.stack
      ?.split('\n')
      .find((line) => line.trim().startsWith('at '))

    expect(firstFrame).toContain('convert.ts')
    expect(firstFrame).not.toContain('error.ts')
    expect(firstFrame).not.toContain('FSRSError')
  })
})
