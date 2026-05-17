export class FSRSError extends Error {
  constructor(message: string = 'FSRS Error') {
    super(message)
    this.name = 'FSRSError'
    Error.captureStackTrace?.(this, FSRSError)
  }
}

export class FSRSValidationError extends FSRSError {
  constructor(message?: string) {
    super(message)
    this.name = 'FSRSValidationError'
    Error.captureStackTrace?.(this, FSRSValidationError)
  }
}

export class FSRSOperationError extends FSRSError {
  constructor(message?: string) {
    super(message)
    this.name = 'FSRSOperationError'
    Error.captureStackTrace?.(this, FSRSOperationError)
  }
}
