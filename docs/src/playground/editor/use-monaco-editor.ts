import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { MonacoEditorHandle } from './monaco'

export type MonacoEditorController = {
  containerRef: RefObject<HTMLDivElement | null>
  error: string
  loading: boolean
  ready: boolean
  getValue(): string | undefined
  load(initialValue: string): Promise<void>
  setValue(value: string): void
}

/**
 * Owns the Monaco instance mounted into `containerRef`: its load lifecycle,
 * theme sync and disposal. Monaco is browser-only and large, so it is imported
 * on demand, which keeps it out of Rspress SSG and off every documentation
 * route that has no playground.
 */
export function useMonacoEditor(
  dark: boolean,
  onChange: (value: string) => void
): MonacoEditorController {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<MonacoEditorHandle | undefined>(undefined)
  const darkRef = useRef(dark)
  darkRef.current = dark
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const generationRef = useRef(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  const load = useCallback(async (initialValue: string) => {
    const generation = ++generationRef.current
    const isCurrent = () => generationRef.current === generation
    const container = containerRef.current
    if (!container) return

    setError('')
    setLoading(true)
    try {
      const { createMonacoEditor } = await import('./monaco')
      const editor = createMonacoEditor(
        container,
        initialValue,
        darkRef.current,
        (value) => onChangeRef.current(value)
      )
      // A remount or a newer load superseded this one; drop the orphan editor.
      if (!isCurrent()) {
        editor.dispose()
        return
      }
      editorRef.current = editor
      setReady(true)
    } catch (error) {
      if (isCurrent()) {
        setError(error instanceof Error ? error.message : String(error))
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    editorRef.current?.setTheme(dark)
  }, [dark])

  useEffect(
    () => () => {
      generationRef.current += 1
      editorRef.current?.dispose()
      editorRef.current = undefined
    },
    []
  )

  const getValue = useCallback(() => editorRef.current?.getValue(), [])
  const setValue = useCallback(
    (value: string) => editorRef.current?.setValue(value),
    []
  )

  return { containerRef, error, getValue, load, loading, ready, setValue }
}
