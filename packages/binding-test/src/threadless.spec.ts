import {
  computeParameters,
  evaluateWithTimeSeriesSplits,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding'

const describeThreadless =
  process.env.NAPI_RS_WASI_FLAVOR === 'wasm32-wasip1' ? describe : describe.skip
const progressError =
  'Progress callbacks are not supported by the threadless wasm32-wasip1 target'
const evaluateError =
  'evaluateWithTimeSeriesSplits is not supported by the threadless wasm32-wasip1 target'

function createItem() {
  return new FSRSBindingItem([
    new FSRSBindingReview(3, 0),
    new FSRSBindingReview(4, 1),
  ])
}

describeThreadless('threadless WASI binding', () => {
  test('computes parameters without progress', async () => {
    const parameters = await computeParameters([createItem()], {
      enableShortTerm: true,
    })

    expect(parameters).toHaveLength(21)
  })

  test('rejects threaded evaluation', async () => {
    await expect(
      evaluateWithTimeSeriesSplits([createItem()], {
        enableShortTerm: true,
      })
    ).rejects.toThrow(evaluateError)
  })

  test.each([
    ['computeParameters', computeParameters],
    ['evaluateWithTimeSeriesSplits', evaluateWithTimeSeriesSplits],
  ])('rejects progress before running %s', async (_name, run) => {
    let called = false
    const result = run([createItem()], {
      enableShortTerm: true,
      progress: () => {
        called = true
      },
    })

    await expect(result).rejects.toThrow(progressError)
    expect(called).toBe(false)
  })
})
