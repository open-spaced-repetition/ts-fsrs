import { useRef, useState } from 'react'
import type {
  OptimizationResult,
  SSEMessage,
  TrainingConfig,
  TrainingStats,
} from '@/types/training'
import { trainingSchema } from '@/types/training-schema'

interface UseSSETrainingOptions {
  onError?: (error: Error) => void
}

interface UseSSETrainingReturn {
  isProcessing: boolean
  statusMessage: string
  results: OptimizationResult[]
  stats: TrainingStats
  startTraining: (
    file: File,
    timezone: string,
    nextDayStartsAt: number,
    config: TrainingConfig
  ) => Promise<void>
  abortTraining: () => void
  resetState: () => void
}

export function useSSETraining(
  options: UseSSETrainingOptions = {}
): UseSSETrainingReturn {
  const { onError } = options

  const [isProcessing, setIsProcessing] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [results, setResults] = useState<OptimizationResult[]>([])
  const [stats, setStats] = useState<TrainingStats>({
    parseTime: '',
    trainingTime: '',
    fsrsItemsCount: 0,
  })

  const handleSSEMessage = (data: SSEMessage) => {
    switch (data.type) {
      case 'status':
        setStatusMessage(data.message)
        break

      case 'parse_complete':
        setStats((prev) => ({
          ...prev,
          parseTime: data.parseTime,
          fsrsItemsCount: data.fsrsItemsCount,
        }))
        setStatusMessage('Parsing completed, starting training...')
        break

      case 'training_start':
        setResults([
          {
            modelVersion: data.modelVersion,
            enableShortTerm: data.enableShortTerm,
            parameters: [],
            progress: '0/0',
            completed: false,
          },
        ])
        setStatusMessage(
          `Training ${data.enableShortTerm ? 'with' : 'without'} short-term memory...`
        )
        break

      case 'progress':
        setResults((prev) =>
          prev.map((r) =>
            r.enableShortTerm === data.enableShortTerm
              ? { ...r, progress: data.progress }
              : r
          )
        )
        break

      case 'training_complete':
        setResults((prev) =>
          prev.map((r) =>
            r.enableShortTerm === data.enableShortTerm
              ? { ...r, parameters: data.parameters, completed: true }
              : r
          )
        )
        break

      case 'complete':
        setStats(data.stats)
        setStatusMessage('All training completed!')
        break

      case 'error': {
        const errorMsg = `Error: ${data.message}`
        if (onError) {
          setStatusMessage('')
          onError(new Error(data.message))
        } else {
          setStatusMessage(errorMsg)
        }
        break
      }
    }
  }

  const startTraining = async (
    file: File,
    timezone: string,
    nextDayStartsAt: number,
    config: TrainingConfig
  ) => {
    setIsProcessing(true)
    setStatusMessage('Uploading file...')

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const parameters = trainingSchema.parse({
        ...config,
        timezone,
        nextDayStartsAt,
      })
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      for (const [name, value] of Object.entries(parameters)) {
        if (value !== undefined) formData.append(name, String(value))
      }

      // Send to server API and handle SSE response
      const response = await fetch('/api/train', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(
          (await response.text()) ||
            `Server request failed (${response.status})`
        )
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete messages
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as SSEMessage
              handleSSEMessage(data)
            } catch (e) {
              console.error('Failed to parse SSE message:', e)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatusMessage('Training cancelled.')
        setResults([])
        setStats({ parseTime: '', trainingTime: '', fsrsItemsCount: 0 })
        return
      }
      console.error('Error processing CSV file:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Processing failed'
      if (onError) {
        setStatusMessage('')
        onError(error instanceof Error ? error : new Error(errorMessage))
      } else {
        setStatusMessage(`Processing failed: ${errorMessage}`)
      }
    } finally {
      abortControllerRef.current = null
      setIsProcessing(false)
    }
  }

  const abortTraining = () => {
    abortControllerRef.current?.abort()
  }

  const resetState = () => {
    setResults([])
    setStatusMessage('')
    setStats({
      parseTime: '',
      trainingTime: '',
      fsrsItemsCount: 0,
    })
  }

  return {
    isProcessing,
    statusMessage,
    results,
    stats,
    startTraining,
    abortTraining,
    resetState,
  }
}
