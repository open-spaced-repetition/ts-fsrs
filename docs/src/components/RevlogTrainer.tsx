import { useI18n } from '@rspress/core/runtime'
import { useEffect, useId, useRef, useState } from 'react'
import {
  acquirePlaygroundRunnerLease,
  trainRevlogCsvInPlaygroundWorker,
} from '@/playground/runner/client'
import {
  getBrowserTimezone,
  getTimezoneOptions,
  validateRevlogTrainingConfig,
} from '@/playground/runner/revlog-config'
import * as styles from '@/playground/shared/styles'
import { cn } from '@/utils/cn'

type TrainingState = 'idle' | 'reading' | 'training'

type RevlogTrainerMessageKey = keyof typeof import('i18n')

type SchemaMessageKey = Extract<
  RevlogTrainerMessageKey,
  `revlogTrainer.schema.${string}`
>

type SchemaRow = {
  readonly field: string
  readonly meaningKey: SchemaMessageKey
  readonly typeKey: SchemaMessageKey
}

const SCHEMA_ROWS = [
  {
    field: 'card_id',
    meaningKey: 'revlogTrainer.schema.card_id.meaning',
    typeKey: 'revlogTrainer.schema.card_id.type',
  },
  {
    field: 'review_time',
    meaningKey: 'revlogTrainer.schema.review_time.meaning',
    typeKey: 'revlogTrainer.schema.review_time.type',
  },
  {
    field: 'review_rating',
    meaningKey: 'revlogTrainer.schema.review_rating.meaning',
    typeKey: 'revlogTrainer.schema.review_rating.type',
  },
  {
    field: 'review_state',
    meaningKey: 'revlogTrainer.schema.review_state.meaning',
    typeKey: 'revlogTrainer.schema.review_state.type',
  },
  {
    field: 'review_duration',
    meaningKey: 'revlogTrainer.schema.review_duration.meaning',
    typeKey: 'revlogTrainer.schema.review_duration.type',
  },
] as const satisfies readonly SchemaRow[]

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export default function RevlogTrainer() {
  const t = useI18n<typeof import('i18n')>()
  const enableShortTermId = useId()
  const inputId = useId()
  const nextDayStartsAtId = useId()
  const timezoneId = useId()
  const runGenerationRef = useRef(0)
  const [enableShortTerm, setEnableShortTerm] = useState(true)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File>()
  const [nextDayStartsAt, setNextDayStartsAt] = useState(4)
  const [progress, setProgress] = useState<
    { readonly current: number; readonly total: number } | undefined
  >()
  const [result, setResult] = useState<
    | {
        readonly durationMs: number
        readonly itemCount: number
        readonly weights: readonly number[]
      }
    | undefined
  >()
  const [state, setState] = useState<TrainingState>('idle')
  const [timezone, setTimezone] = useState('UTC')
  const [timezoneOptions, setTimezoneOptions] = useState<readonly string[]>()

  useEffect(() => {
    const browserTimezone = getBrowserTimezone()
    setTimezone(browserTimezone)
    setTimezoneOptions(getTimezoneOptions(browserTimezone))
    const releaseRunner = acquirePlaygroundRunnerLease()
    return () => {
      runGenerationRef.current += 1
      releaseRunner()
    }
  }, [])

  const busy = state !== 'idle'
  const clearOutput = () => {
    setError('')
    setProgress(undefined)
    setResult(undefined)
  }

  const train = async () => {
    if (!file || busy) return

    const validation = validateRevlogTrainingConfig(timezone, nextDayStartsAt)
    if (!validation.ok) {
      clearOutput()
      setError(
        validation.error === 'invalid-timezone'
          ? t('revlogTrainer.invalidTimezone')
          : t('revlogTrainer.invalidNextDayStart')
      )
      return
    }

    const config = validation.config
    if (config.timezone !== timezone) setTimezone(config.timezone)
    const generation = ++runGenerationRef.current
    const isCurrentRun = () => runGenerationRef.current === generation

    clearOutput()
    setState('reading')
    try {
      const csvText = await file.text()
      if (!isCurrentRun()) return
      setState('training')
      const response = await trainRevlogCsvInPlaygroundWorker({
        csvText,
        enableShortTerm,
        nextDayStartsAt: config.nextDayStartsAt,
        onProgress({ current, total }) {
          if (isCurrentRun()) setProgress({ current, total })
        },
        timezone: config.timezone,
      })
      if (!isCurrentRun()) return
      if (response.ok) {
        setResult(response)
      } else {
        setError(t('revlogTrainer.trainingError', { message: response.error }))
      }
    } catch (caught) {
      if (isCurrentRun()) {
        const message =
          caught instanceof Error ? caught.message : String(caught)
        setError(t('revlogTrainer.trainingError', { message }))
      }
    } finally {
      if (isCurrentRun()) setState('idle')
    }
  }

  return (
    <section
      className="rp-not-doc my-4.5 mb-6 rounded-[14px] border border-line bg-panel p-4.5"
      aria-label={t('revlogTrainer.trainerLabel')}
    >
      {/* One control per row: in a two-column grid the checkbox ended up
          floating far from the label it belongs to. */}
      <div className="grid gap-3">
        <label className={styles.field} htmlFor={timezoneId}>
          <span>{t('revlogTrainer.timezone')}</span>
          {timezoneOptions ? (
            <select
              className={styles.control}
              data-testid="revlog-timezone"
              disabled={busy}
              id={timezoneId}
              onChange={(event) => {
                setTimezone(event.currentTarget.value)
                clearOutput()
              }}
              value={timezone}
            >
              {timezoneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              autoComplete="off"
              className={styles.control}
              data-testid="revlog-timezone"
              disabled={busy}
              id={timezoneId}
              onChange={(event) => {
                setTimezone(event.currentTarget.value)
                clearOutput()
              }}
              placeholder={t('revlogTrainer.timezonePlaceholder')}
              spellCheck={false}
              type="text"
              value={timezone}
            />
          )}
        </label>
        <label className={styles.field} htmlFor={nextDayStartsAtId}>
          <span>{t('revlogTrainer.nextDayStartsAt')}</span>
          <select
            className={styles.control}
            data-testid="revlog-next-day-start"
            disabled={busy}
            id={nextDayStartsAtId}
            onChange={(event) => {
              setNextDayStartsAt(Number(event.currentTarget.value))
              clearOutput()
            }}
            value={nextDayStartsAt}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
        <label
          // `max-w-85` matches `styles.control`, so the checkbox lands on the
          // same right edge as the selects instead of at the panel's edge.
          className={cn(
            styles.field,
            'min-h-9.5 max-w-85 grid-cols-[1fr_auto] items-center'
          )}
          htmlFor={enableShortTermId}
        >
          <span>{t('revlogTrainer.enableShortTerm')}</span>
          <input
            checked={enableShortTerm}
            className={styles.checkbox}
            data-testid="revlog-enable-short-term"
            disabled={busy}
            id={enableShortTermId}
            onChange={(event) => {
              setEnableShortTerm(event.currentTarget.checked)
              clearOutput()
            }}
            type="checkbox"
          />
        </label>
      </div>

      <p className="mt-2.5 mb-0 text-xs text-muted">
        {t('revlogTrainer.config', {
          timezone: timezone || '—',
          nextDayStartsAt: String(nextDayStartsAt).padStart(2, '0'),
        })}{' '}
        {t('revlogTrainer.enableShortTermHint')}
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 max-md:flex-col max-md:items-stretch">
        {/* Visually hidden, but still the focusable control the label drives. */}
        <input
          accept=".csv,text/csv"
          className="peer sr-only"
          data-testid="revlog-file"
          disabled={busy}
          id={inputId}
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0])
            clearOutput()
          }}
          type="file"
        />
        <label
          className={cn(
            styles.button,
            'inline-flex items-center',
            'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2',
            'peer-focus-visible:outline-ring'
          )}
          htmlFor={inputId}
        >
          {t('revlogTrainer.select')}
        </label>
        <button
          className={cn(styles.button, styles.primaryButton)}
          data-testid="revlog-train"
          disabled={!file || busy}
          onClick={() => void train()}
          type="button"
        >
          {t('revlogTrainer.submit')}
        </button>
        <a
          className={cn(styles.link, 'ml-auto text-[13px] max-md:ml-0')}
          href="https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv"
        >
          {t('revlogTrainer.download')}
        </a>
      </div>

      <p className="mt-2.5 mb-0 text-[13px] text-muted">
        {file
          ? t('revlogTrainer.selected', { name: file.name })
          : t('revlogTrainer.idle')}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="m-0 w-full border-collapse text-xs">
          <caption className="mb-2 text-left font-bold text-body">
            {t('revlogTrainer.schema')}
          </caption>
          <thead>
            <tr>
              <th className={cn(styles.tableCell, 'bg-header')}>
                {t('revlogTrainer.field')}
              </th>
              <th className={cn(styles.tableCell, 'bg-header')}>
                {t('revlogTrainer.type')}
              </th>
              <th className={cn(styles.tableCell, 'bg-header')}>
                {t('revlogTrainer.meaning')}
              </th>
            </tr>
          </thead>
          <tbody>
            {SCHEMA_ROWS.map((row) => (
              <tr key={row.field}>
                <td className={styles.tableCell}>
                  <code className={styles.inlineCode}>{row.field}</code>
                </td>
                <td className={styles.tableCell}>{t(row.typeKey)}</td>
                <td className={styles.tableCell}>{t(row.meaningKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="mt-3.5 text-[13px] text-muted empty:hidden"
        aria-live="polite"
      >
        {state === 'reading' && t('revlogTrainer.reading')}
        {state === 'training' &&
          (progress
            ? t('revlogTrainer.trainingProgress', {
                current: String(progress.current),
                total: String(progress.total),
              })
            : t('revlogTrainer.training'))}
        {error && (
          <pre
            className={cn(styles.resultBlock, 'text-danger')}
            data-testid="revlog-error"
          >
            {error}
          </pre>
        )}
        {result && (
          <div data-testid="revlog-result">
            <p className="m-0 mb-2">
              {t('revlogTrainer.result', {
                itemCount: String(result.itemCount),
                durationMs: result.durationMs.toFixed(0),
              })}
            </p>
            <strong className="font-semibold">
              {t('revlogTrainer.weights')}
            </strong>
            <pre className={styles.resultBlock}>
              {JSON.stringify(result.weights, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}
