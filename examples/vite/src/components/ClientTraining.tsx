import { computeParameters } from '@open-spaced-repetition/binding'
import { useId, useRef, useState } from 'react'

import type { OptimizationResult, TrainingStats } from '../types/training'
import { convertFSRSItemByFile } from '../utils/convert'

interface ClientTrainingProps {
  onProcessingChange?: (isProcessing: boolean) => void
}

export default function ClientTraining({
  onProcessingChange,
}: ClientTrainingProps) {
  // Generate unique IDs for form fields
  const nextDayStartsAtId = useId()
  const numRelearningStepsId = useId()

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nextDayStartsAt, setNextDayStartsAt] = useState<number>(4)
  const [numRelearningSteps, setNumRelearningSteps] = useState<number>(1)
  const [results, setResults] = useState<OptimizationResult[]>([])
  const [stats, setStats] = useState<TrainingStats>({
    parseTime: '',
    trainingTime: '',
    fsrsItemsCount: 0,
  })

  // Use refs to track last update time for throttling
  const lastUpdateTimeRef = useRef<{ [key: string]: number }>({})
  const UPDATE_THROTTLE_MS = 500 // Update UI at most every 100ms

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const MAX_FILE_SIZE_MB = 100 // 100MB limit for client-side processing
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(
          `File size exceeds ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`
        )
        event.target.value = '' // Reset file input
        return
      }
      setCsvFile(file)
      // Reset previous results
      setResults([])
      setStats({
        parseTime: '',
        trainingTime: '',
        fsrsItemsCount: 0,
      })
    }
  }

  const handleProcessCSV = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first')
      return
    }

    setIsProcessing(true)
    onProcessingChange?.(true)

    try {
      // Read CSV file
      console.time('parsing csv time')
      const parseStartTime = performance.now()

      // Convert CSV to FSRS items
      const fsrsItems = await convertFSRSItemByFile(csvFile, nextDayStartsAt)

      const parseEndTime = performance.now()
      const parseDuration = `${(parseEndTime - parseStartTime).toFixed(2)}ms`
      console.timeEnd('parsing csv time')

      setStats((prev) => ({
        ...prev,
        parseTime: parseDuration,
        fsrsItemsCount: fsrsItems.length,
      }))

      console.log(`fsrs_items.len() = ${fsrsItems.length}`)

      // Start training
      console.time('full training time')
      const trainingStartTime = performance.now()

      // Initialize results for both short-term enabled and disabled
      setResults([
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
      ])

      // Compute parameters wrapper
      const computeParametersWrapper = async (enableShortTerm: boolean) => {
        const key = `enableShortTerm_${enableShortTerm}`

        // Track progress state to avoid redundant updates
        let lastProgressUpdate = { cur: -1, total: -1 }

        const optimizedParameters = await computeParameters(fsrsItems, {
          enableShortTerm,
          numRelearningSteps,
          progress: (cur, total) => {
            // Skip if progress hasn't changed
            if (lastProgressUpdate.cur === cur && lastProgressUpdate.total === total) {
              return
            }

            // Throttle UI updates to avoid excessive re-renders
            const now = Date.now()
            const lastUpdate = lastUpdateTimeRef.current[key] || 0

            // Always update on first call, last call, or after throttle interval
            const shouldUpdate =
              cur === 0 ||
              cur === total ||
              now - lastUpdate >= UPDATE_THROTTLE_MS

            if (shouldUpdate) {
              console.debug(
                `[enableShortTerm = ${
                  enableShortTerm ? 1 : 0
                }] Progress: ${cur}/${total}`
              )

              lastUpdateTimeRef.current[key] = now
              lastProgressUpdate = { cur, total }

              // Update progress in real-time using functional update
              // to ensure we always work with the latest state
              setResults((prev) =>
                prev.map((r) =>
                  r.enableShortTerm === enableShortTerm
                    ? { ...r, progress: `${cur}/${total}` }
                    : r
                )
              )
            }
          },
        })

        console.log(
          `[enableShortTerm = ${enableShortTerm}] optimized parameters:`,
          optimizedParameters
        )

        // Update results with completed parameters using functional update
        setResults((prev) =>
          prev.map((r) =>
            r.enableShortTerm === enableShortTerm
              ? { ...r, parameters: optimizedParameters, completed: true }
              : r
          )
        )
      }

      // Run computations sequentially to reduce memory pressure
      // Running in parallel may cause WebAssembly memory access errors with large datasets
      await computeParametersWrapper(true)
      await computeParametersWrapper(false)

      const trainingEndTime = performance.now()
      const trainingDuration = `${(trainingEndTime - trainingStartTime).toFixed(
        2
      )}ms`
      setStats((prev) => ({
        ...prev,
        trainingTime: trainingDuration,
      }))
      console.timeEnd('full training time')
    } catch (error) {
      console.error('Error processing CSV file:', error)
      alert(`Processing failed: ${error}`)
    } finally {
      setIsProcessing(false)
      onProcessingChange?.(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Client-Side FSRS Training
      </h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          1. Select CSV File and Configuration
        </h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2.5 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        />
        {csvFile && (
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Selected file: {csvFile.name}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={nextDayStartsAtId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Next Day Starts At (hour)
            </label>
            <input
              type="number"
              id={nextDayStartsAtId}
              value={nextDayStartsAt}
              onChange={(e) =>
                setNextDayStartsAt(Number(e.target.value) || nextDayStartsAt)
              }
              disabled={isProcessing}
              min={0}
              max={23}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Hour when a new day begins (0-23)
            </p>
          </div>

          <div>
            <label
              htmlFor={numRelearningStepsId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Number of Relearning Steps
            </label>
            <input
              type="number"
              id={numRelearningStepsId}
              value={numRelearningSteps}
              onChange={(e) => setNumRelearningSteps(Number(e.target.value))}
              disabled={isProcessing}
              min={0}
              max={10}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Number of learning steps before a card is considered relearned
              (0-10)
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={handleProcessCSV}
          disabled={!csvFile || isProcessing}
          className="px-6 py-3 text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isProcessing ? 'Processing...' : 'Start Processing'}
        </button>
      </div>

      {stats.parseTime && (
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="mb-2 text-gray-900 dark:text-gray-100">
            <strong>Parse Time:</strong> {stats.parseTime}
          </p>
          <p className="text-gray-900 dark:text-gray-100">
            <strong>FSRS Items Count:</strong> {stats.fsrsItemsCount}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            2. Optimization Results
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {results.map((result) => {
              const [current, total] = result.progress.split('/').map(Number)
              const progressPercentage =
                total > 0 ? Math.round((current / total) * 100) : 0

              return (
                <div
                  key={
                    result.enableShortTerm
                      ? 'short-term-enabled'
                      : 'short-term-disabled'
                  }
                  className={`p-5 border rounded-lg ${
                    result.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    {result.enableShortTerm
                      ? 'Short-Term Enabled'
                      : 'Short-Term Disabled'}
                  </h3>

                  {/* Progress bar */}
                  {!result.completed && result.progress !== '0/0' && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Progress: {result.progress}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {result.completed && (
                    <div>
                      <p className="mb-2 text-green-700 dark:text-green-400 font-medium">
                        ✓ Completed
                      </p>
                      <p className="mb-2 text-gray-900 dark:text-gray-100">
                        <strong>Optimized Parameters:</strong>
                      </p>
                      <pre className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded-md overflow-auto text-sm">
                        {JSON.stringify(result.parameters, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!result.completed &&
                    isProcessing &&
                    result.progress === '0/0' && (
                      <p className="text-orange-600 dark:text-orange-400">
                        Waiting to start...
                      </p>
                    )}
                </div>
              )
            })}
          </div>

          {stats.trainingTime && (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-900 dark:text-gray-100">
                <strong>Total Training Time:</strong> {stats.trainingTime}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Instructions:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>
            Download sample CSV file:{' '}
            <a
              href="https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              revlog.csv
            </a>
          </li>
          <li>Click &quot;Select CSV File&quot; to upload a CSV file</li>
          <li>
            Click &quot;Start Processing&quot; button to begin parameter
            optimization
          </li>
          <li>
            Wait for computation to complete and view the optimized results
          </li>
        </ol>
      </div>
    </div>
  )
}
