import { computeParameters } from '@open-spaced-repetition/binding'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { streamSSE } from 'hono/streaming'
import { handle } from 'hono/vercel'
import type { OptimizationResult } from '@/types/training'
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
        const timezone = (formData.get('timezone') as string) || 'Asia/Shanghai'
        const nextDayStartsAtStr =
          (formData.get('nextDayStartsAt') as string) || '4'
        const nextDayStartsAt = parseInt(nextDayStartsAtStr, 10)
        const numRelearningStepsStr =
          (formData.get('numRelearningSteps') as string) || '1'
        const numRelearningSteps = parseInt(numRelearningStepsStr, 10)

        if (
          Number.isNaN(nextDayStartsAt) ||
          nextDayStartsAt < 0 ||
          nextDayStartsAt > 23 ||
          Number.isNaN(numRelearningSteps)
        ) {
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'error',
              message: 'Invalid parameters provided.',
            }),
          })
          return
        }

        if (!file) {
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
        const fsrsItems = await convertFSRSItemByFile(
          file,
          nextDayStartsAt,
          timezone
        )

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

        // Initialize results for both short-term enabled and disabled
        const results: OptimizationResult[] = [
          {
            enableShortTerm: true,
            parameters: [],
            progress: '0/0',
            completed: false,
          },
          {
            enableShortTerm: false,
            parameters: [],
            progress: '0/0',
            completed: false,
          },
        ]

        // Compute parameters wrapper with progress streaming
        const computeParametersWrapper = async (enableShortTerm: boolean) => {
          // Determine result index based on enableShortTerm
          const resultIndex = enableShortTerm ? 0 : 1

          // Send training start event
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'training_start',
              enableShortTerm,
            }),
          })

          const optimizedParameters = await computeParameters(fsrsItems, {
            enableShortTerm,
            numRelearningSteps,
            progress: async (cur, total) => {
              console.debug(
                `[Server][enableShortTerm = ${enableShortTerm ? 1 : 0}] Progress: ${cur}/${total}`
              )

              // Send progress update via SSE
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'progress',
                  enableShortTerm,
                  current: cur,
                  total: total,
                  progress: `${cur}/${total}`,
                }),
              })
            },
          })

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

        // Run computations sequentially to reduce memory pressure
        // Running in parallel may cause WebAssembly memory access errors with large datasets
        await computeParametersWrapper(true)
        await computeParametersWrapper(false)

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
