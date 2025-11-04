'use client';

import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding';
import { useEffect, useState } from 'react';

import type { OptimizationResult, TrainingStats } from '@/types/training';
import { getTimezoneOffset } from '@/utils/timezone';

interface TimezoneOption {
  value: string;
  label: string;
}

interface ClientTrainingProps {
  onProcessingChange?: (isProcessing: boolean) => void;
}

export default function ClientTraining({
  onProcessingChange,
}: ClientTrainingProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nextDayStartsAt, setNextDayStartsAt] = useState<number>(4);
  const [numRelearningSteps, setNumRelearningSteps] = useState<number>(1);
  const [timezone, setTimezone] = useState<string>(() => {
    // Initialize with user's system timezone using lazy initializer
    if (typeof window !== 'undefined') {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        return 'Asia/Shanghai';
      }
    }
    return 'Asia/Shanghai'; // SSR fallback
  });
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [stats, setStats] = useState<TrainingStats>({
    parseTime: '',
    trainingTime: '',
    fsrsItemsCount: 0,
  });

  // Fetch timezone options
  useEffect(() => {
    fetch('/api/timezone')
      .then((res) => res.json())
      .then((data) => setTimezones(data))
      .catch((err) => console.error('Failed to fetch timezones:', err));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Reset previous results
      setResults([]);
      setStats({
        parseTime: '',
        trainingTime: '',
        fsrsItemsCount: 0,
      });
    }
  };

  const handleProcessCSV = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first');
      return;
    }

    setIsProcessing(true);
    onProcessingChange?.(true);

    try {
      // Read CSV file
      console.time('parsing csv time');
      const parseStartTime = performance.now();

      let arrayBuffer: ArrayBuffer | null = await csvFile.arrayBuffer();
      let buffer: Uint8Array | null = new Uint8Array(arrayBuffer);

      // Convert CSV to FSRS items
      const fsrsItems = convertCsvToFsrsItems(
        buffer,
        nextDayStartsAt,
        timezone,
        getTimezoneOffset
      );

      // Release intermediate buffers to free memory
      arrayBuffer = null;
      buffer = null;

      const parseEndTime = performance.now();
      const parseDuration = `${(parseEndTime - parseStartTime).toFixed(2)}ms`;
      console.timeEnd('parsing csv time');

      setStats((prev) => ({
        ...prev,
        parseTime: parseDuration,
        fsrsItemsCount: fsrsItems.length,
      }));

      console.log(`fsrs_items.len() = ${fsrsItems.length}`);

      // Start training
      console.time('full training time');
      const trainingStartTime = performance.now();

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
      ]);

      // Compute parameters wrapper
      const computeParametersWrapper = async (enableShortTerm: boolean) => {
        const optimizedParameters = await computeParameters(fsrsItems, {
          enableShortTerm,
          numRelearningSteps,
          progress: (cur, total) => {
            console.debug(
              `[enableShortTerm = ${
                enableShortTerm ? 1 : 0
              }] Progress: ${cur}/${total}`
            );

            // Update progress in real-time
            setResults((prev) =>
              prev.map((r) =>
                r.enableShortTerm === enableShortTerm
                  ? { ...r, progress: `${cur}/${total}` }
                  : r
              )
            );
          },
        });

        console.log(
          `[enableShortTerm = ${enableShortTerm}] optimized parameters:`,
          optimizedParameters
        );

        // Update results with completed parameters
        setResults((prev) =>
          prev.map((r) =>
            r.enableShortTerm === enableShortTerm
              ? { ...r, parameters: optimizedParameters, completed: true }
              : r
          )
        );
      };

      // Run computations sequentially to reduce memory pressure
      // Running in parallel may cause WebAssembly memory access errors with large datasets
      await computeParametersWrapper(true);
      await computeParametersWrapper(false);

      const trainingEndTime = performance.now();
      const trainingDuration = `${(trainingEndTime - trainingStartTime).toFixed(
        2
      )}ms`;
      setStats((prev) => ({
        ...prev,
        trainingTime: trainingDuration,
      }));
      console.timeEnd('full training time');
    } catch (error) {
      console.error('Error processing CSV file:', error);
      alert(`Processing failed: ${error}`);
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <h1 className='text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100'>
        Client-Side FSRS Training
      </h1>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100'>
          1. Select CSV File and Configuration
        </h2>
        <input
          type='file'
          accept='.csv'
          onChange={handleFileChange}
          disabled={isProcessing}
          className='block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2.5 disabled:opacity-50 disabled:cursor-not-allowed mb-4'
        />
        {csvFile && (
          <p className='mb-4 text-sm text-gray-600 dark:text-gray-400'>
            Selected file: {csvFile.name}
          </p>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label
              htmlFor='timezone'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Timezone
            </label>
            <select
              id='timezone'
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={isProcessing}
              className='block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed'
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
              htmlFor='nextDayStartsAt'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Next Day Starts At (hour)
            </label>
            <input
              type='number'
              id='nextDayStartsAt'
              value={nextDayStartsAt}
              onChange={(e) => setNextDayStartsAt(Number(e.target.value))}
              disabled={isProcessing}
              min={0}
              max={23}
              className='block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Hour when a new day begins (0-23)
            </p>
          </div>
        </div>

        <div className='mt-4'>
          <label
            htmlFor='numRelearningSteps'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
          >
            Number of Relearning Steps
          </label>
          <input
            type='number'
            id='numRelearningSteps'
            value={numRelearningSteps}
            onChange={(e) => setNumRelearningSteps(Number(e.target.value))}
            disabled={isProcessing}
            min={0}
            max={10}
            className='block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50 disabled:cursor-not-allowed'
          />
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
            Number of learning steps before a card is considered relearned
            (0-10)
          </p>
        </div>
      </div>

      <div className='mb-6'>
        <button
          type='button'
          onClick={handleProcessCSV}
          disabled={!csvFile || isProcessing}
          className='px-6 py-3 text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white'
        >
          {isProcessing ? 'Processing...' : 'Start Processing'}
        </button>
      </div>

      {stats.parseTime && (
        <div className='mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg'>
          <p className='mb-2 text-gray-900 dark:text-gray-100'>
            <strong>Parse Time:</strong> {stats.parseTime}
          </p>
          <p className='text-gray-900 dark:text-gray-100'>
            <strong>FSRS Items Count:</strong> {stats.fsrsItemsCount}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className='mt-8'>
          <h2 className='text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100'>
            2. Optimization Results
          </h2>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
            {results.map((result) => {
              const [current, total] = result.progress.split('/').map(Number);
              const progressPercentage =
                total > 0 ? Math.round((current / total) * 100) : 0;

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
                  <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100'>
                    {result.enableShortTerm
                      ? 'Short-Term Enabled'
                      : 'Short-Term Disabled'}
                  </h3>

                  {/* Progress bar */}
                  {!result.completed && result.progress !== '0/0' && (
                    <div className='mb-4'>
                      <div className='flex justify-between items-center mb-2'>
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                          Progress: {result.progress}
                        </span>
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                          {progressPercentage}%
                        </span>
                      </div>
                      <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden'>
                        <div
                          className='bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out'
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {result.completed && (
                    <div>
                      <p className='mb-2 text-green-700 dark:text-green-400 font-medium'>
                        ✓ Completed
                      </p>
                      <p className='mb-2 text-gray-900 dark:text-gray-100'>
                        <strong>Optimized Parameters:</strong>
                      </p>
                      <pre className='bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded-md overflow-auto text-sm'>
                        {JSON.stringify(result.parameters, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!result.completed &&
                    isProcessing &&
                    result.progress === '0/0' && (
                      <p className='text-orange-600 dark:text-orange-400'>
                        Waiting to start...
                      </p>
                    )}
                </div>
              );
            })}
          </div>

          {stats.trainingTime && (
            <div className='p-4 bg-gray-100 dark:bg-gray-700 rounded-lg'>
              <p className='text-gray-900 dark:text-gray-100'>
                <strong>Total Training Time:</strong> {stats.trainingTime}
              </p>
            </div>
          )}
        </div>
      )}

      <div className='mt-10 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg'>
        <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100'>
          Instructions:
        </h3>
        <ol className='list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300'>
          <li>
            Download sample CSV file:{' '}
            <a
              href='https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline'
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
  );
}
