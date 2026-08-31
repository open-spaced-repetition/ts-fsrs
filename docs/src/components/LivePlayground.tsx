import { useDark, useI18n } from '@rspress/core/runtime'
import {
  IconExperimental,
  IconLink,
  IconTitle,
  SvgWrapper,
} from '@rspress/core/theme'
import { useEffect, useState } from 'react'
import { useMonacoEditor } from '@/playground/editor/use-monaco-editor'
import { usePlaygroundRunner } from '@/playground/runner/use-playground-runner'
import {
  createCustomScenario,
  PLAYGROUND_SCENARIOS,
  type PlaygroundScenario,
} from '@/playground/shared/scenarios'
import { readSharedCode } from '@/playground/shared/share-link'
import * as styles from '@/playground/shared/styles'
import { useShare } from '@/playground/shared/use-share'
import { cn } from '@/utils/cn'
import WorkerLogLine from './WorkerLogLine'

const INITIAL_SCENARIO = PLAYGROUND_SCENARIOS[0]
if (!INITIAL_SCENARIO) throw new Error('The playground has no scenarios.')

const SCENARIO_ICONS = {
  binding: IconExperimental,
  custom: IconLink,
  'ts-fsrs': IconTitle,
} satisfies Record<PlaygroundScenario['id'], typeof IconTitle>

export default function LivePlayground() {
  const dark = useDark()
  const t = useI18n<typeof import('i18n')>()
  const [activeId, setActiveId] = useState<PlaygroundScenario['id']>(
    INITIAL_SCENARIO.id
  )
  const [code, setCode] = useState(INITIAL_SCENARIO.code)
  const [customScenario, setCustomScenario] = useState<PlaygroundScenario>()
  const share = useShare(t)
  const runner = usePlaygroundRunner()
  const {
    containerRef,
    error: editorError,
    getValue: getEditorValue,
    load: loadEditor,
    loading: editorLoading,
    ready: editorReady,
    setValue: setEditorValue,
  } = useMonacoEditor(dark, setCode)

  useEffect(() => {
    // The fragment is unavailable during SSG, so shared code is applied here
    // rather than in the initial state. It joins the tabs as its own scenario,
    // which keeps the tabs a plain content switch and leaves Reset pointing at
    // the shared code rather than at an example that never rendered.
    const sharedCode = readSharedCode(window.location.hash)
    if (sharedCode !== undefined) {
      setCustomScenario(createCustomScenario(sharedCode))
      setActiveId('custom')
      setCode(sharedCode)
    }
    // The editor loads on mount so the first visit is immediately runnable.
    void loadEditor(sharedCode ?? INITIAL_SCENARIO.code)
  }, [loadEditor])

  const scenarios = customScenario
    ? [...PLAYGROUND_SCENARIOS, customScenario]
    : PLAYGROUND_SCENARIOS

  const load = (value: string) => {
    setCode(value)
    runner.clear()
    share.clear()
    setEditorValue(value)
  }

  const selectScenario = (scenario: PlaygroundScenario) => {
    setActiveId(scenario.id)
    // Keep a stale permalink out of the address bar once its code is replaced.
    window.history.replaceState(null, '', window.location.pathname)
    load(scenario.code)
  }

  const reset = () => {
    const scenario = scenarios.find(({ id }) => id === activeId)
    if (scenario) selectScenario(scenario)
  }

  const run = () => {
    share.clear()
    void runner.run(getEditorValue() ?? code)
  }

  const copyShareLink = () => share.share(getEditorValue() ?? code)

  const runnable = editorReady && runner.state === 'idle'
  const shareButtonLabel = share.copied
    ? t('playground.shareDone')
    : share.status || t('playground.share')

  return (
    <section
      className={cn(
        'rp-not-doc playground-surface relative my-7 mb-9.5 overflow-hidden',
        'rounded-[22px] border border-line shadow-playground',
        // The gradient hairline across the top of the panel.
        'before:absolute before:inset-x-0 before:top-0 before:h-0.75',
        'before:bg-linear-[90deg,var(--color-accent),var(--color-brand),#ba5de8]',
        'before:content-[""]'
      )}
      aria-label={t('playground.label')}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
        event.preventDefault()
        if (runnable) void run()
      }}
    >
      <header
        className={cn(
          'px-6.5 pt-6 pb-4.5',
          'max-md:px-4.5 max-md:pt-5.25 max-md:pb-3.75'
        )}
      >
        <div>
          <p className="m-0 mb-1.25 text-[11px] font-[750] tracking-[0.14em] text-accent uppercase">
            {t('playground.eyebrow')}
          </p>
          {/* Rspress resets heading weight globally and restores it only for
              documentation prose, which `rp-not-doc` opts out of. */}
          <h2 className="m-0 border-0 text-[clamp(20px,3vw,27px)]/[1.15] font-semibold">
            {t('playground.title')}
          </h2>
        </div>
      </header>

      <div className="flex items-center justify-between gap-4 px-6.5 pb-3.5 max-md:block max-md:px-4.5 max-md:pb-3">
        <div className="flex flex-wrap gap-1.5">
          {scenarios.map((scenario) => (
            <button
              aria-pressed={scenario.id === activeId}
              aria-label={t(scenario.labelKey)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-[10px]',
                'border border-line bg-panel px-3.25 py-2',
                'text-[13px] font-semibold text-muted [font-family:inherit]',
                'transition duration-150 hover:border-line-strong hover:bg-surface-soft hover:text-body',
                'focus-visible:outline-3 focus-visible:outline-offset-2',
                'focus-visible:outline-ring motion-reduce:transition-none',
                'data-[active=true]:border-line-brand data-[active=true]:bg-brand-soft',
                'data-[active=true]:text-brand',
                'dark:border-white/15 dark:bg-white/6 dark:text-white/80',
                'dark:hover:border-white/25 dark:hover:bg-white/10 dark:hover:text-white',
                'dark:data-[active=true]:border-[#9488ff]',
                'dark:data-[active=true]:bg-[#6254e8]/25',
                'dark:data-[active=true]:text-[#c5beff]',
                'max-md:size-10 max-md:justify-center max-md:p-0'
              )}
              data-active={scenario.id === activeId}
              key={scenario.id}
              onClick={() => selectScenario(scenario)}
              title={t(scenario.labelKey)}
              type="button"
              disabled={!runnable}
            >
              <span aria-hidden="true">
                <SvgWrapper
                  height={18}
                  icon={SCENARIO_ICONS[scenario.id]}
                  width={18}
                />
              </span>
              <span className="max-md:sr-only">{t(scenario.labelKey)}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 max-md:mt-2.5">
          <button
            aria-keyshortcuts="Control+Enter Meta+Enter"
            aria-label={t('playground.run')}
            className={cn(styles.actionButton, styles.primaryButton)}
            data-tooltip={`${runner.state === 'idle' ? t('playground.run') : t('playground.runBusy')} · Ctrl/⌘ ↵`}
            data-testid="playground-run"
            disabled={!runnable}
            onClick={run}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m8 5 11 7-11 7Z" fill="currentColor" />
            </svg>
          </button>
          <button
            aria-label={t('playground.reset')}
            className={styles.actionButton}
            data-tooltip={`${t('playground.reset')} · Enter`}
            disabled={!runnable}
            onClick={reset}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M4 12a8 8 0 1 0 2.34-5.66L4 8.67M4 4v4.67h4.67"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
          <button
            aria-label={shareButtonLabel}
            className={cn(
              styles.actionButton,
              'data-[copied=true]:border-line-success data-[copied=true]:bg-accent-muted',
              'data-[copied=true]:text-on-accent'
            )}
            data-copied={share.copied}
            data-testid="playground-share"
            data-tooltip={`${shareButtonLabel} · Enter`}
            disabled={!runnable}
            onClick={() => void copyShareLink()}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <rect
                fill="none"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                width="12"
                x="8"
                y="8"
              />
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'playground-resizable relative mx-4.5 h-[min(55vh,440px)] min-h-85',
          'max-h-[80vh] resize-y overflow-hidden rounded-[15px]',
          'border border-line bg-editor',
          'max-md:mx-2.25 max-md:h-90 max-md:min-h-60'
        )}
      >
        <div className="h-full w-full" ref={containerRef} />
        {!editorReady && (
          <div className="absolute inset-0 grid place-items-center gap-2.5 bg-surface p-6 text-center text-[13px] text-muted">
            {editorLoading ? (
              <span>{t('playground.editorLoading')}</span>
            ) : (
              <>
                <span role="alert">
                  {t('playground.editorError', { message: editorError })}
                </span>
                <button
                  className={cn(styles.button, styles.primaryButton)}
                  onClick={() => void loadEditor(code)}
                  type="button"
                >
                  {t('playground.editorRetry')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          // A fixed band so a run never pushes the page down, tall enough for
          // an expanded result, and resizable when a transcript outgrows it.
          'playground-resizable relative mx-4.5 mt-3 mb-4.5 h-[min(45vh,380px)]',
          'max-h-[80vh] min-h-50 resize-y',
          'overflow-auto rounded-[14px] border border-line bg-output',
          'max-md:mx-2.25',
          'data-[state=success]:border-line-success',
          'data-[state=error]:border-line-danger'
        )}
        data-state={
          runner.error ? 'error' : runner.logs.length > 0 ? 'success' : 'empty'
        }
        data-testid="playground-output"
        aria-live="polite"
      >
        <div className="sticky top-0 flex justify-between border-b border-line bg-surface-soft px-3.5 py-2.5 text-[11px] font-[650] tracking-[0.04em] text-muted uppercase">
          <span>{t('playground.output')}</span>
          {runner.durationMs !== undefined && (
            <span>{runner.durationMs.toFixed(0)} ms</span>
          )}
        </div>
        {runner.logs.length === 0 && !runner.error && (
          <p className="m-0 px-4 py-6 text-center text-xs text-subtle">
            {t('playground.placeholder')}
          </p>
        )}
        {/* The Worker returns an immutable ordered transcript; duplicate lines are valid. */}
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
    </section>
  )
}
