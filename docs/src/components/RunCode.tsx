import { useI18n } from '@rspress/core/runtime'
import WorkerLogLine from '@/components/WorkerLogLine'
import { usePlaygroundRunner } from '@/playground/runner/use-playground-runner'
import { sourceId } from '@/playground/shared/source-id'
import * as styles from '@/playground/shared/styles'
import { cn } from '@/utils/cn'

type Props = {
  readonly code: string
  readonly test?: boolean
}

export default function RunCode({ code, test = true }: Props) {
  const t = useI18n<typeof import('i18n')>()
  const runner = usePlaygroundRunner()
  const hasOutput = runner.logs.length > 0 || runner.error
  const testStatus = runner.error
    ? 'error'
    : runner.durationMs !== undefined
      ? 'success'
      : runner.state

  return (
    <div
      className="rp-not-doc my-3"
      data-run-code-source={test ? sourceId(code) : undefined}
      data-run-code-status={test ? testStatus : undefined}
      data-testid={test ? 'run-code-test' : undefined}
    >
      <button
        className={cn(styles.button, styles.primaryButton)}
        data-testid="run-code-button"
        disabled={runner.state !== 'idle'}
        onClick={() => void runner.run(code)}
        type="button"
      >
        {runner.state === 'idle'
          ? `▶ ${t('playground.run')}`
          : t('playground.runBusy')}
      </button>
      {hasOutput && (
        <div
          aria-live="polite"
          className="mt-3 overflow-auto rounded-[10px] border border-line bg-output"
          data-testid="run-code-output"
        >
          {runner.logs.map((line, index) => (
            <WorkerLogLine
              className={cn(styles.logLine, index > 0 && styles.logDivider)}
              // biome-ignore lint/suspicious/noArrayIndexKey: duplicate transcript lines need their position.
              key={`${line.level}-${index}`}
              line={line}
            />
          ))}
          {runner.error && (
            <pre
              className={cn(
                styles.logLine,
                'text-danger',
                runner.logs.length > 0 && styles.logDivider
              )}
            >
              {runner.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
