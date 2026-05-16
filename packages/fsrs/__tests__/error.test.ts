import * as fsrsExports from 'ts-fsrs'
import {
  checkParameters,
  createEmptyCard,
  FSRSAlgorithm,
  fsrs,
  type Grade,
  generatorParameters,
  Rating,
  TypeConvert,
} from 'ts-fsrs'
import { FSRSError, FSRSErrorCode } from 'ts-fsrs/error'

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
  code: FSRSErrorCode,
  message: string | RegExp
): FSRSError => {
  const error = captureThrownError(action)
  expect(error).toBeInstanceOf(FSRSError)
  expect(error).toBeInstanceOf(Error)

  const fsrsError = error as FSRSError
  expect(fsrsError.name).toBe('FSRSError')
  expect(fsrsError.code).toBe(code)
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
    expect('FSRSErrorCode' in fsrsExports).toBe(false)
  })

  test('keeps the native Error shape with an FSRS error code', () => {
    const error = new FSRSError(FSRSErrorCode.INVALID_INPUT, 'Invalid value')

    expect(error).toBeInstanceOf(FSRSError)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('FSRSError')
    expect(error.code).toBe(FSRSErrorCode.INVALID_INPUT)
    expect(error.message).toBe('Invalid value')
  })

  test('uses the error code as the default message', () => {
    const error = new FSRSError(FSRSErrorCode.INVALID_INPUT)

    expect(error.message).toBe('FSRS Error')
    expect(error.code).toBe(FSRSErrorCode.INVALID_INPUT)
  })

  test('wraps invalid input errors', () => {
    expectFSRSError(
      () => TypeConvert.time('invalid-date'),
      FSRSErrorCode.INVALID_INPUT,
      'Invalid date:[invalid-date]'
    )
  })

  test('wraps validation failures', () => {
    expectFSRSError(
      () => checkParameters([0.40255]),
      FSRSErrorCode.VALIDATION_FAILED,
      /^Invalid parameter length/
    )
  })

  test('wraps invalid memory state errors', () => {
    const algorithm = new FSRSAlgorithm(generatorParameters())

    expectFSRSError(
      () =>
        algorithm.next_state(
          {
            difficulty: 0.5,
            stability: 0,
          },
          0,
          Rating.Good
        ),
      FSRSErrorCode.INVALID_STATE,
      'Invalid memory state { difficulty: 0.5, stability: 0 }'
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
      FSRSErrorCode.INVALID_OPERATION,
      'Cannot review a manual rating'
    )
  })

  test('captures stack from the business throw site', () => {
    const error = expectFSRSError(
      () => TypeConvert.time('invalid-date'),
      FSRSErrorCode.INVALID_INPUT,
      'Invalid date:[invalid-date]'
    )
    const firstFrame = error.stack
      ?.split('\n')
      .find((line) => line.trim().startsWith('at '))

    expect(firstFrame).toContain('convert.ts')
    expect(firstFrame).not.toContain('error.ts')
    expect(firstFrame).not.toContain('FSRSError')
  })
})
