export class SRSSchedulerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SRSSchedulerError'
    Error?.captureStackTrace?.(this, SRSSchedulerError)
  }
}
