'use client'

import { useEffect, useId, useState } from 'react'
import { useSSETraining } from '@/hooks/useSSETraining'

interface TimezoneOption {
  value: string
  label: string
}

interface ServerTrainingProps {
  onProcessingChange?: (isProcessing: boolean) => void
}

export default function ServerTraining({
  onProcessingChange,
}: ServerTrainingProps) {
  // Generate unique IDs for form fields
  const timezoneId = useId()
  const nextDayStartsAtId = useId()
  const numRelearningStepsId = useId()

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [nextDayStartsAt, setNextDayStartsAt] = useState<number>(4)
  const [numRelearningSteps, setNumRelearningSteps] = useState<number>(1)
  const [timezone, setTimezone] = useState<string>(() => {
    // Initialize with user's system timezone using lazy initializer
    if (typeof window !== 'undefined') {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
      } catch {
        return 'Asia/Shanghai'
      }
    }
    return 'Asia/Shanghai' // SSR fallback
  })
  const [timezones, setTimezones] = useState<TimezoneOption[]>([])

  // Use SSE training hook
  const {
    isProcessing,
    statusMessage,
    results,
    stats,
    startTraining,
    resetState,
  } = useSSETraining({
    onError: (error) => {
      alert(`Processing failed: ${error.message}`)
    },
  })

  // Fetch timezone options
  useEffect(() => {
    fetch('/api/timezone')
      .then((res) => res.json())
      .then((data) => setTimezones(data))
      .catch((err) => console.error('Failed to fetch timezones:', err))
  }, [])

  // Notify parent component when processing state changes
  useEffect(() => {
    onProcessingChange?.(isProcessing)
  }, [isProcessing, onProcessingChange])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      // Reset previous results
      resetState()
    }
  }

  const handleProcessCSV = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first')
      return
    }

    await startTraining(csvFile, timezone, nextDayStartsAt, numRelearningSteps)
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Server-Side FSRS Training
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
              htmlFor={timezoneId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Timezone
            </label>
            <select
              id={timezoneId}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

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
              onChange={(e) => setNextDayStartsAt(Number(e.target.value))}
              disabled={isProcessing}
              min={0}
              max={23}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Hour when a new day begins (0-23)
            </p>
          </div>
        </div>

        <div className="mt-4">
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
            className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Number of learning steps before a card is considered relearned
            (0-10)
          </p>
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={handleProcessCSV}
          disabled={!csvFile || isProcessing}
          className="px-6 py-3 text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white"
        >
          {isProcessing ? 'Processing on Server...' : 'Start Server Processing'}
        </button>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-blue-800 dark:text-blue-300 font-medium">
            {statusMessage}
          </p>
        </div>
      )}

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
                          className="bg-green-600 dark:bg-green-500 h-3 rounded-full transition-all duration-300 ease-out"
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

      <div className="mt-10 p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
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
              className="text-green-600 hover:underline"
            >
              revlog.csv
            </a>
          </li>
          <li>Click &quot;Select CSV File&quot; to upload a CSV file</li>
          <li>
            Click &quot;Start Server Processing&quot; button to begin parameter
            optimization on the server
          </li>
          <li>
            Wait for computation to complete and view the optimized results
          </li>
        </ol>
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Note:</strong> Server-side training processes the file on
            the server, which may be more suitable for large datasets or when
            you want to offload computation from the client.
          </p>
        </div>
      </div>
    </div>
  )
}
