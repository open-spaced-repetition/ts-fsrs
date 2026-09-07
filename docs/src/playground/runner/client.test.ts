import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunnerMessage, RunnerRequest, RunnerResponse } from './protocol'

type WorkerListener = (event: MessageEvent<RunnerMessage> | ErrorEvent) => void

class FakeWorker {
  static constructorError: Error | undefined
  static instances: FakeWorker[] = []

  readonly messages: RunnerRequest[] = []
  readonly terminate = vi.fn()
  private readonly errorListeners: WorkerListener[] = []
  private readonly messageListeners: WorkerListener[] = []

  constructor() {
    if (FakeWorker.constructorError) throw FakeWorker.constructorError
    FakeWorker.instances.push(this)
  }

  addEventListener(type: 'error' | 'message', listener: WorkerListener): void {
    if (type === 'message') this.messageListeners.push(listener)
    else this.errorListeners.push(listener)
  }

  emitError(message: string): void {
    const event = { message } as ErrorEvent
    for (const listener of this.errorListeners) listener(event)
  }

  emitMessage(message: RunnerMessage): void {
    const event = { data: message } as MessageEvent<RunnerMessage>
    for (const listener of this.messageListeners) listener(event)
  }

  postMessage(request: RunnerRequest): void {
    this.messages.push(request)
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  FakeWorker.constructorError = undefined
  FakeWorker.instances = []
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('window', { setTimeout: globalThis.setTimeout })
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('playground runner lifecycle', () => {
  it('cleans up a request when Worker construction fails', async () => {
    const { acquirePlaygroundRunnerLease, runInPlaygroundWorker } =
      await import('./client')
    const release = acquirePlaygroundRunnerLease()
    FakeWorker.constructorError = new Error('Worker construction failed')

    await expect(runInPlaygroundWorker('first attempt')).rejects.toThrow(
      'Worker construction failed'
    )
    expect(vi.getTimerCount()).toBe(0)

    FakeWorker.constructorError = undefined
    const retry = runInPlaygroundWorker('retry')
    const worker = FakeWorker.instances[0]
    worker?.emitMessage({ type: 'ready' })
    expect(worker?.messages).toHaveLength(1)
    expect(worker?.messages[0]).toMatchObject({ code: 'retry' })
    worker?.emitMessage({
      durationMs: 1,
      id: worker.messages[0]?.id ?? -1,
      logs: [],
      ok: true,
      type: 'run-result',
    })
    await expect(retry).resolves.toMatchObject({ ok: true })
    release()
  })

  it('ignores ready, error, and result events from a stale Worker generation', async () => {
    const { acquirePlaygroundRunnerLease, runInPlaygroundWorker } =
      await import('./client')

    const releaseFirst = acquirePlaygroundRunnerLease()
    const firstRun = runInPlaygroundWorker('first generation')
    const firstWorker = FakeWorker.instances[0]
    expect(firstWorker).toBeDefined()
    firstWorker?.emitMessage({ type: 'ready' })
    const firstRequest = firstWorker?.messages[0]
    expect(firstRequest).toBeDefined()
    firstWorker?.emitMessage({
      durationMs: 1,
      id: firstRequest?.id ?? -1,
      logs: [{ at: 0, level: 'log', text: 'first' }],
      ok: true,
      type: 'run-result',
    })
    await expect(firstRun).resolves.toMatchObject({ ok: true })
    releaseFirst()
    expect(firstWorker?.terminate).toHaveBeenCalledOnce()

    const releaseSecond = acquirePlaygroundRunnerLease()
    const secondRun = runInPlaygroundWorker('replacement generation')
    const secondWorker = FakeWorker.instances[1]
    expect(secondWorker).toBeDefined()

    let secondSettled = false
    void secondRun.finally(() => {
      secondSettled = true
    })

    firstWorker?.emitMessage({ type: 'ready' })
    firstWorker?.emitError('stale crash')
    firstWorker?.emitMessage({
      durationMs: 2,
      id: (firstRequest?.id ?? 0) + 1,
      logs: [{ at: 0, level: 'log', text: 'stale result' }],
      ok: true,
      type: 'run-result',
    })
    await Promise.resolve()

    expect(firstWorker?.messages).toHaveLength(1)
    expect(secondWorker?.terminate).not.toHaveBeenCalled()
    expect(secondSettled).toBe(false)

    secondWorker?.emitMessage({ type: 'ready' })
    const secondRequest = secondWorker?.messages[0]
    expect(secondRequest).toBeDefined()
    const replacementResponse: RunnerResponse = {
      durationMs: 3,
      id: secondRequest?.id ?? -1,
      logs: [{ at: 0, level: 'log', text: 'replacement result' }],
      ok: true,
      type: 'run-result',
    }
    secondWorker?.emitMessage(replacementResponse)

    await expect(secondRun).resolves.toEqual(replacementResponse)
    releaseSecond()
    expect(secondWorker?.terminate).toHaveBeenCalledOnce()
  })

  it('keeps shared pending work alive until the final consumer releases', async () => {
    const { acquirePlaygroundRunnerLease, runInPlaygroundWorker } =
      await import('./client')

    const releaseFirst = acquirePlaygroundRunnerLease()
    const releaseSecond = acquirePlaygroundRunnerLease()
    const completedRun = runInPlaygroundWorker('shared pending work')
    const worker = FakeWorker.instances[0]
    worker?.emitMessage({ type: 'ready' })
    const completedRequest = worker?.messages[0]

    releaseFirst()
    expect(worker?.terminate).not.toHaveBeenCalled()
    worker?.emitMessage({
      durationMs: 4,
      id: completedRequest?.id ?? -1,
      logs: [],
      ok: true,
      type: 'run-result',
    })
    await expect(completedRun).resolves.toMatchObject({ ok: true })

    const abandonedRun = runInPlaygroundWorker('abandoned pending work')
    const abandonedRejection = expect(abandonedRun).rejects.toThrow(
      'no active consumers'
    )
    releaseSecond()

    await abandonedRejection
    expect(worker?.terminate).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('sends CSV text to the shared Worker and forwards complete training results', async () => {
    const { acquirePlaygroundRunnerLease, trainRevlogCsvInPlaygroundWorker } =
      await import('./client')
    const progress = vi.fn()
    const release = acquirePlaygroundRunnerLease()
    const training = trainRevlogCsvInPlaygroundWorker({
      csvText: 'card_id,review_time,review_rating,review_state,review_duration',
      enableShortTerm: false,
      nextDayStartsAt: 23,
      onProgress: progress,
      timezone: 'Asia/Tokyo',
    })
    const worker = FakeWorker.instances[0]
    worker?.emitMessage({ type: 'ready' })
    const request = worker?.messages[0]
    expect(request).toMatchObject({
      csvText: 'card_id,review_time,review_rating,review_state,review_duration',
      enableShortTerm: false,
      nextDayStartsAt: 23,
      timezone: 'Asia/Tokyo',
      type: 'train-csv',
    })
    worker?.emitMessage({
      current: 2,
      id: request?.id ?? -1,
      total: 5,
      type: 'training-progress',
    })
    expect(progress).toHaveBeenCalledWith({
      current: 2,
      id: request?.id,
      total: 5,
      type: 'training-progress',
    })

    const weights = [0.123456789, 1.987654321]
    worker?.emitMessage({
      durationMs: 12,
      id: request?.id ?? -1,
      itemCount: 3,
      ok: true,
      type: 'training-result',
      weights,
    })
    await expect(training).resolves.toMatchObject({ weights })
    release()
  })

  it('keeps queued work alive while training reports progress', async () => {
    const {
      acquirePlaygroundRunnerLease,
      runInPlaygroundWorker,
      trainRevlogCsvInPlaygroundWorker,
    } = await import('./client')
    const release = acquirePlaygroundRunnerLease()
    const training = trainRevlogCsvInPlaygroundWorker({
      csvText: 'review data',
      enableShortTerm: true,
      nextDayStartsAt: 4,
      timezone: 'UTC',
    })
    const worker = FakeWorker.instances[0]
    worker?.emitMessage({ type: 'ready' })
    const request = worker?.messages[0]
    const queuedRun = runInPlaygroundWorker('queued behind training')
    const queuedRequest = worker?.messages[1]

    await vi.advanceTimersByTimeAsync(44_000)
    worker?.emitMessage({
      current: 1,
      id: request?.id ?? -1,
      total: 2,
      type: 'training-progress',
    })
    await vi.advanceTimersByTimeAsync(44_000)
    expect(worker?.terminate).not.toHaveBeenCalled()

    worker?.emitMessage({
      durationMs: 88_000,
      id: request?.id ?? -1,
      itemCount: 1,
      ok: true,
      type: 'training-result',
      weights: [1],
    })
    await expect(training).resolves.toMatchObject({ ok: true })
    worker?.emitMessage({
      durationMs: 1,
      id: queuedRequest?.id ?? -1,
      logs: [],
      ok: true,
      type: 'run-result',
    })
    await expect(queuedRun).resolves.toMatchObject({ ok: true })
    release()
  })

  it.each([
    [24, 'UTC', /nextDayStartsAt must be an integer from 0 through 23/],
    [4, 'Mars/Base', /timezone must be a valid IANA timezone name/],
  ] as const)('rejects invalid configuration before creating a Worker', async (nextDayStartsAt, timezone, message) => {
    // Import after the test globals because runner-client owns module-level Worker state.
    const { trainRevlogCsvInPlaygroundWorker } = await import('./client')

    await expect(
      trainRevlogCsvInPlaygroundWorker({
        csvText: '',
        enableShortTerm: true,
        nextDayStartsAt,
        timezone,
      })
    ).rejects.toThrow(message)
    expect(FakeWorker.instances).toHaveLength(0)
  })
})
