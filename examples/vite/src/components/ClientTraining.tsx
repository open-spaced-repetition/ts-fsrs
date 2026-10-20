import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { TrainingMessage, TrainingRequest } from '../training.worker'
import type {
  OptimizationResult,
  TrainingModel,
  TrainingStats,
} from '../types/training'
import TrainingError from './TrainingError'

interface ClientTrainingProps {
  onProcessingChange?: (isProcessing: boolean) => void
}

const INITIAL_STATS: TrainingStats = {
  parseTime: '',
  trainingTime: '',
  fsrsItemsCount: 0,
}

export default function ClientTraining({
  onProcessingChange,
}: ClientTrainingProps) {
  // Generate unique IDs for form fields
  const nextDayStartsAtId = useId()
  const numRelearningStepsId = useId()
  const modelVersionId = useId()
  const modelOptionId = useId()

  const [modelVersion, setModelVersion] = useState<TrainingModel>('FSRS-7')
  const [enableShortTerm, setEnableShortTerm] = useState(true)
  const [enableSchedPenalties, setEnableSchedPenalties] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nextDayStartsAt, setNextDayStartsAt] = useState<number>(4)
  const [numRelearningSteps, setNumRelearningSteps] = useState<number>(1)
  const [results, setResults] = useState<OptimizationResult[]>([])
  const [stats, setStats] = useState<TrainingStats>(INITIAL_STATS)

  const workerRef = useRef<Worker | null>(null)
  useEffect(() => () => workerRef.current?.terminate(), [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setCsvFile(null)
    setResults([])
    setStats(INITIAL_STATS)
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const MAX_FILE_SIZE_MB = 100 // 100MB limit for client-side processing
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(
        `File size exceeds ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`
      )
      event.target.value = '' // Reset file input
      return
    }
    setCsvFile(file)
  }

  const finish = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsProcessing(false)
    onProcessingChange?.(false)
  }, [onProcessingChange])

  const handleCancel = useCallback(() => {
    finish()
    setError(null)
    setResults([])
    setStats(INITIAL_STATS)
  }, [finish])

  const handleProcessCSV = () => {
    setError(null)
    if (!csvFile) {
      setError('Please select a CSV file first')
      return
    }
    setIsProcessing(true)
    onProcessingChange?.(true)
    setResults([
      {
        modelVersion,
        enableShortTerm: modelVersion === 'FSRS-7' || enableShortTerm,
        enableSchedPenalties: modelVersion === 'FSRS-7' && enableSchedPenalties,
        parameters: [],
        progress: '0/0',
        completed: false,
      },
    ])
    setStats(INITIAL_STATS)
    try {
      const worker = new Worker(
        new URL('../training.worker.ts', import.meta.url),
        { type: 'module' }
      )
      workerRef.current = worker
      worker.onmessage = ({ data }: MessageEvent<TrainingMessage>) => {
        switch (data.type) {
          case 'parsed':
            setStats((prev) => ({
              ...prev,
              parseTime: data.parseTime,
              fsrsItemsCount: data.fsrsItemsCount,
            }))
            break
          case 'progress':
            setResults((prev) =>
              prev.map((r) => ({ ...r, progress: data.progress }))
            )
            break
          case 'result':
            setResults((prev) =>
              prev.map((r) => ({
                ...r,
                parameters: data.parameters,
                completed: true,
              }))
            )
            break
          case 'done':
            setStats((prev) => ({ ...prev, trainingTime: data.trainingTime }))
            finish()
            break
          case 'error':
            finish()
            setError(`Processing failed: ${data.message}`)
        }
      }
      worker.onerror = (event) => {
        finish()
        setError(`Processing failed: ${event.message}`)
      }
      worker.postMessage({
        file: csvFile,
        nextDayStartsAt,
        numRelearningSteps,
        modelVersion,
        enableShortTerm,
        enableSchedPenalties,
      } satisfies TrainingRequest)
    } catch (error) {
      finish()
      setError(
        `Processing failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Client-Side FSRS Training
      </h1>

      <TrainingError message={error} />

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

        <div className="mb-4">
          <label
            htmlFor={modelVersionId}
            className="block text-sm font-medium mb-2"
          >
            Model Version
          </label>
          <select
            id={modelVersionId}
            value={modelVersion}
            disabled={isProcessing}
            className="w-full rounded border border-gray-300 bg-white p-2.5 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            onChange={(event) => {
              setModelVersion(
                event.target.value === 'FSRS-6' ? 'FSRS-6' : 'FSRS-7'
              )
              setResults([])
              setStats(INITIAL_STATS)
              setError(null)
            }}
          >
            <option value="FSRS-7">FSRS-7 (34 parameters)</option>
            <option value="FSRS-6">FSRS-6 (21 parameters)</option>
          </select>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {modelVersion === 'FSRS-7'
              ? 'Uses fractional study days and same-day reviews. Short-term memory is always enabled.'
              : 'Uses whole study days. Short-term memory can be disabled.'}
          </p>
          <label
            htmlFor={modelOptionId}
            className="mt-3 flex items-center gap-2"
          >
            <input
              id={modelOptionId}
              type="checkbox"
              disabled={isProcessing}
              checked={
                modelVersion === 'FSRS-7'
                  ? enableSchedPenalties
                  : enableShortTerm
              }
              onChange={(event) =>
                modelVersion === 'FSRS-7'
                  ? setEnableSchedPenalties(event.target.checked)
                  : setEnableShortTerm(event.target.checked)
              }
            />
            {modelVersion === 'FSRS-7'
              ? 'Enable Scheduling Penalties'
              : 'Enable Short-Term Memory'}
          </label>
        </div>

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
                setNextDayStartsAt(
                  e.target.value === ''
                    ? nextDayStartsAt
                    : Number(e.target.value)
                )
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

          {modelVersion === 'FSRS-6' && (
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
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleProcessCSV}
          disabled={!csvFile || isProcessing}
          className="px-6 py-3 text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isProcessing ? 'Processing...' : 'Start Processing'}
        </button>
        {isProcessing && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 text-base font-medium rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
          >
            Cancel
          </button>
        )}
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

          <div className="grid grid-cols-1 gap-6 mb-6">
            {results.map((result) => {
              const [current, total] = result.progress.split('/').map(Number)
              const progressPercentage =
                total > 0 ? Math.round((current / total) * 100) : 0

              return (
                <div
                  key={result.modelVersion}
                  className={`p-5 border rounded-lg ${
                    result.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                    {result.modelVersion} (
                    {result.modelVersion === 'FSRS-7' ? 34 : 21} parameters)
                  </h3>

                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    {result.modelVersion === 'FSRS-7'
                      ? `Scheduling penalties: ${result.enableSchedPenalties ? 'enabled' : 'disabled'}`
                      : `Short-term memory: ${result.enableShortTerm ? 'enabled' : 'disabled'}`}
                  </p>

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
            Wait for computation to complete and view the optimized results. Use
            &quot;Cancel&quot; to abort a running training.
          </li>
        </ol>
      </div>
    </div>
  )
}
