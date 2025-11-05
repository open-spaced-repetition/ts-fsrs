import { useState } from 'react'
import type {
  OptimizationResult,
  SSEMessage,
  TrainingStats,
} from '@/types/training'

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
    numRelearningSteps: number
  ) => Promise<void>
  resetState: () => void
}

export function useSSETraining(
  options: UseSSETrainingOptions = {}
): UseSSETrainingReturn {
  const { onError } = options

  const [isProcessing, setIsProcessing] = useState(false)
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
        setResults((prev) => {
          const newResults = [...prev]
          if (newResults.length === 0) {
            // Initialize results array
            newResults.push(
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
              }
            )
          }
          return newResults
        })
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
        setStatusMessage(errorMsg)
        if (onError) {
          onError(new Error(data.message))
        } else {
          alert(errorMsg)
        }
        break
      }
    }
  }

  const startTraining = async (
    file: File,
    timezone: string,
    nextDayStartsAt: number,
    numRelearningSteps: number
  ) => {
    setIsProcessing(true)
    setStatusMessage('Uploading file...')

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('timezone', timezone)
      formData.append('nextDayStartsAt', nextDayStartsAt.toString())
      formData.append('numRelearningSteps', numRelearningSteps.toString())

      // Send to server API and handle SSE response
      const response = await fetch('/api/train', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Server request failed')
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
      console.error('Error processing CSV file:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Processing failed'
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      } else {
        alert(`Processing failed: ${errorMessage}`)
      }
    } finally {
      setIsProcessing(false)
      setStatusMessage('')
    }
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
    resetState,
  }
}
