export const FSRSErrorCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_STATE: 'INVALID_STATE',
  INVALID_OPERATION: 'INVALID_OPERATION',
} as const

export type FSRSErrorCode = (typeof FSRSErrorCode)[keyof typeof FSRSErrorCode]

export class FSRSError extends Error {
  readonly code: FSRSErrorCode

  constructor(code: FSRSErrorCode, message: string = 'FSRS Error') {
    super(message)
    this.name = 'FSRSError'
    this.code = code
    Error.captureStackTrace?.(this, FSRSError)
  }
}
