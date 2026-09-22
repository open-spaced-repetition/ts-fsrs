import { useI18n } from '@rspress/core/runtime'
import { useEffect, useState } from 'react'
import type { RunnerLog } from '@/playground/runner/protocol'
import * as styles from '@/playground/shared/styles'
import { cn } from '@/utils/cn'

export default function CopyOutputButton({
  logs,
  error,
}: {
  readonly logs: readonly RunnerLog[]
  readonly error?: string
}) {
  const output = [
    ...logs.map((line) => line.text),
    ...(error ? [error] : []),
  ].join('\n')
  const t = useI18n<typeof import('i18n')>()
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  // biome-ignore lint/correctness/useExhaustiveDependencies: changing the output clears stale copy feedback.
  useEffect(() => {
    setStatus('idle')
  }, [output])

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2400)
    return () => window.clearTimeout(timer)
  }, [status])

  const label = t(
    status === 'copied'
      ? 'playground.outputCopied'
      : status === 'failed'
        ? 'playground.copyFailed'
        : 'playground.copyOutput'
  )

  return (
    <>
      <button
        aria-label={label}
        className={cn(styles.actionButton, 'copy-output-button')}
        data-status={status}
        data-tooltip={label}
        data-testid="copy-output"
        disabled={logs.length === 0 && !error}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(output)
            setStatus('copied')
          } catch {
            setStatus('failed')
          }
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g className="copy-output-glyph">
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </g>
          <path
            className="copy-output-check"
            d="m5 12 4 4L19 6"
            pathLength="1"
          />
        </svg>
      </button>
      <span className="sr-only" role="status">
        {status === 'idle' ? '' : label}
      </span>
    </>
  )
}
