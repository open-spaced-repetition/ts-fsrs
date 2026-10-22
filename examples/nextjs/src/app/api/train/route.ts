import { handle } from '@hono/vercel'
import { computeParameters } from '@open-spaced-repetition/binding'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { streamSSE } from 'hono/streaming'
import type { OptimizationResult } from '@/types/training'
import { trainingFormSchema } from '@/types/training-schema'
import { convertFSRSItemByFile } from '@/utils/convert'

export const dynamic = 'force-dynamic'

// Create Hono app
const app = new Hono().basePath('/api/train')

// POST endpoint for server-side training with SSE progress streaming
app.post(
  '/',
  bodyLimit({
    // https://hono.dev/docs/middleware/builtin/body-limit
    maxSize: 50 * 1024 * 1024, // 50mb
    onError: (c) => {
      return c.text('overflow :(', 413)
    },
  }),
  async (c) => {
    return streamSSE(c, async (stream) => {
      try {
        // Parse form data
        const formData = await c.req.formData()
        const file = formData.get('file') as File | null
        const { nextDayStartsAt, timezone, ...config } =
          trainingFormSchema.parse(Object.fromEntries(formData))

        if (!(file instanceof File)) {
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'error',
              message: 'No file provided',
            }),
          })
          return
        }

        // Send initial status
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'status',
            message: 'Parsing CSV file...',
          }),
        })

        // Timing: Parse CSV
        const parseStartTime = performance.now()

        // Convert CSV to FSRS items
        const { items: fsrsItems, cardIds } = await convertFSRSItemByFile(
          file,
          nextDayStartsAt,
          timezone,
          config.modelVersion
        )

        if (fsrsItems.length === 0) {
          throw new Error('No valid reviews were found for the selected model.')
        }
        const parseEndTime = performance.now()
        const parseDuration = parseEndTime - parseStartTime
        const parseTime = `${parseDuration.toFixed(2)}ms`

        console.debug(`[Server] fsrs_items.len() = ${fsrsItems.length}`)

        // Send parse completion
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'parse_complete',
            parseTime: parseTime,
            fsrsItemsCount: fsrsItems.length,
          }),
        })

        // Timing: Training
        const trainingStartTime = performance.now()

        const results: OptimizationResult[] = [
          {
            modelVersion: config.modelVersion,
            enableShortTerm: config.enableShortTerm,
            parameters: [],
            progress: '0/0',
            completed: false,
          },
        ]

        // Compute parameters wrapper with progress streaming
        const computeParametersWrapper = async (enableShortTerm: boolean) => {
          const resultIndex = 0

          // Send training start event
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'training_start',
              modelVersion: config.modelVersion,
              enableShortTerm,
            }),
          })

          // Use a promise chain to serialize progress SSE writes and preserve ordering
          let writeQueue = Promise.resolve()

          const optimizedParameters = await computeParameters(fsrsItems, {
            ...config,
            cardIds,
            progress: (cur, total) => {
              console.debug(
                `[Server][enableShortTerm = ${enableShortTerm ? 1 : 0}] Progress: ${cur}/${total}`
              )
              if (c.req.raw.signal.aborted) {
                return false
              }
              // Enqueue progress update to preserve message ordering
              writeQueue = writeQueue
                .then(() =>
                  stream.writeSSE({
                    data: JSON.stringify({
                      type: 'progress',
                      enableShortTerm,
                      current: cur,
                      total: total,
                      progress: `${cur}/${total}`,
                    }),
                  })
                )
                .catch((error) => {
                  console.error(
                    '[Server] Error sending progress update:',
                    error
                  )
                })
            },
          })

          await writeQueue
          console.debug(
            `[Server][enableShortTerm = ${enableShortTerm}] optimized parameters:`,
            optimizedParameters
          )

          // Update result with completed parameters
          results[resultIndex] = {
            ...results[resultIndex],
            parameters: optimizedParameters,
            completed: true,
          }

          // Send training complete event
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'training_complete',
              enableShortTerm,
              parameters: optimizedParameters,
            }),
          })
        }

        await computeParametersWrapper(config.enableShortTerm)

        const trainingEndTime = performance.now()
        const trainingDuration = trainingEndTime - trainingStartTime
        const trainingTime = `${trainingDuration.toFixed(2)}ms`

        // Send final completion event
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'complete',
            stats: {
              parseTime: parseTime,
              trainingTime: trainingTime,
              fsrsItemsCount: fsrsItems.length,
            },
            results,
          }),
        })
      } catch (error) {
        console.error('[Server] Error processing CSV file:', error)
        await stream.writeSSE({
          data: JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
          }),
        })
      }
    })
  }
)

// Export Next.js compatible handlers
export const POST = handle(app)
