import { useDark, useI18n } from '@rspress/core/runtime'
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
          'flex items-start justify-between gap-5 px-6.5 pt-6 pb-4.5',
          'max-md:block max-md:px-4.5 max-md:pt-5.25 max-md:pb-3.75'
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
        <span
          className={cn(
            'inline-flex min-h-7.5 items-center rounded-full px-2.75 py-1.25',
            'border border-line-accent bg-accent-soft font-mono text-[11px] text-muted',
            'whitespace-nowrap max-md:mt-3.25 max-md:whitespace-normal',
            // The status dot.
            'before:mr-1.75 before:size-1.75 before:rounded-full',
            'before:bg-accent before:shadow-dot before:content-[""]'
          )}
        >
          {t('playground.runtime')}
        </span>
      </header>

      <div className="flex gap-1.5 px-6.5 pb-3.5 max-md:overflow-x-auto max-md:px-4.5 max-md:pb-3">
        {scenarios.map((scenario) => (
          <button
            aria-pressed={scenario.id === activeId}
            className={cn(
              'cursor-pointer rounded-[10px] border border-transparent px-3.25 py-2',
              'text-[13px] font-semibold text-muted [font-family:inherit]',
              'transition duration-150 hover:bg-panel hover:text-body',
              'focus-visible:outline-3 focus-visible:outline-offset-2',
              'focus-visible:outline-ring motion-reduce:transition-none',
              'data-[active=true]:border-line-brand data-[active=true]:bg-brand-soft',
              'data-[active=true]:text-brand max-md:whitespace-nowrap'
            )}
            data-active={scenario.id === activeId}
            key={scenario.id}
            onClick={() => selectScenario(scenario)}
            type="button"
            disabled={!runnable}
          >
            {t(scenario.labelKey)}
          </button>
        ))}
      </div>

      <div className="relative mx-4.5 overflow-hidden rounded-[15px] border border-line bg-editor max-md:mx-2.25">
        <div
          className="h-[min(55vh,440px)] min-h-85 w-full max-md:h-105 max-md:min-h-80"
          ref={containerRef}
        />
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

      {/* Labels that change while running are stacked in a grid so each button
          keeps the width of its widest state and the row never reflows. */}
      <div className="flex items-center gap-2.25 px-5 py-4 max-md:flex-col max-md:items-stretch max-md:px-3 max-md:py-3.25">
        <button
          className={cn(styles.button, styles.primaryButton, styles.swapButton)}
          data-testid="playground-run"
          disabled={!runnable}
          onClick={run}
          type="button"
        >
          <span data-shown={runner.state === 'idle'}>
            {t('playground.run')}
          </span>
          <span data-shown={runner.state !== 'idle'}>
            {t('playground.runBusy')}
          </span>
        </button>
        <button
          className={styles.button}
          disabled={!runnable}
          onClick={reset}
          type="button"
        >
          {t('playground.reset')}
        </button>
        <button
          className={cn(
            styles.button,
            styles.swapButton,
            'data-[copied=true]:border-line-success data-[copied=true]:bg-accent-muted',
            'data-[copied=true]:text-on-accent'
          )}
          data-copied={share.copied}
          data-testid="playground-share"
          disabled={!runnable}
          onClick={() => void copyShareLink()}
          type="button"
        >
          <span data-shown={!share.copied}>{t('playground.share')}</span>
          <span data-shown={share.copied}>{t('playground.shareDone')}</span>
        </button>
        <span
          className={cn(
            'ml-auto text-[11px] text-subtle max-md:mx-0.5 max-md:mt-1 max-md:ml-0',
            'data-[status=share]:font-[650] data-[status=share]:text-on-accent'
          )}
          data-status={share.status ? 'share' : undefined}
          aria-live="polite"
        >
          {runner.state === 'compiling'
            ? t('playground.compiling')
            : runner.state === 'running'
              ? t('playground.running')
              : share.status || t('playground.hint')}
        </span>
      </div>

      <div
        className={cn(
          // A fixed band so a run never pushes the page down, tall enough for
          // an expanded result, and resizable when a transcript outgrows it.
          'mx-4.5 mb-4.5 h-[min(45vh,380px)] min-h-50 resize-y',
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
