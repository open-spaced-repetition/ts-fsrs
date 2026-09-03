import { useI18n, useLang } from '@rspress/core/runtime'
import {
  copyToClipboard,
  IconCopy,
  IconSuccess,
} from '@rspress/core/theme-original'
import { type CSSProperties, useEffect, useId, useRef, useState } from 'react'
import { landingPreviews, landingSnippets } from '@/landing/runtime'
import type { LandingSnippetId } from '@/landing/snippets'
import { cn } from '@/utils/cn'
import { CodeWindow } from './CodeWindow'
import { GradeList } from './GradeList'
import * as styles from './styles'

// Cap the shared height so the default tab does not inherit a screenful of space.
const CODE_LINE_CEILING = 18
const CODE_LINES = Math.min(
  CODE_LINE_CEILING,
  Math.max(
    ...Object.values(landingSnippets).map(
      (snippet) => snippet.source.split('\n').length
    )
  )
)

const TABS: readonly {
  readonly id: LandingSnippetId
  readonly labelKey: 'home.tab.default' | 'home.tab.compose' | 'home.tab.extend'
}[] = [
  { id: 'default', labelKey: 'home.tab.default' },
  { id: 'compose', labelKey: 'home.tab.compose' },
  { id: 'extend', labelKey: 'home.tab.extend' },
]

const ARROW_STEPS: Record<string, number | undefined> = {
  ArrowLeft: -1,
  ArrowRight: 1,
}

const COPY_FEEDBACK_MS = 2400

const noop = () => {}

export function SchedulerWorkbench() {
  const t = useI18n<typeof import('i18n')>()
  const lang = useLang()
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('default')
  const [copied, setCopied] = useState(false)
  const copyResetRef = useRef<number>(undefined)
  const tabRefs = useRef(new Map<LandingSnippetId, HTMLButtonElement>())
  const panelId = useId()
  const copyLabel = copied ? t('home.copied') : t('home.copy')

  useEffect(() => () => window.clearTimeout(copyResetRef.current), [])

  function select(id: (typeof TABS)[number]['id']) {
    setActive(id)
    setCopied(false)
  }

  return (
    <div
      className={cn('rp-not-doc w-full max-w-2xl', styles.codeWindow)}
      style={{ '--landing-code-lines': CODE_LINES } as CSSProperties}
    >
      <div className={styles.windowBar}>
        {/* The copy button is not a tab, so it stays outside the tablist. */}
        <div className="flex items-center gap-1" role="tablist">
          {TABS.map(({ id, labelKey }, position) => (
            <button
              // Only the selected panel is mounted, so every tab points at it.
              aria-controls={panelId}
              aria-selected={active === id}
              className={styles.tab}
              id={`${panelId}-tab-${id}`}
              key={id}
              onClick={() => select(id)}
              onKeyDown={(event) => {
                const step = ARROW_STEPS[event.key]
                if (!step) return
                event.preventDefault()
                const next = TABS[(position + step + TABS.length) % TABS.length]
                select(next.id)
                tabRefs.current.get(next.id)?.focus()
              }}
              ref={(node) => {
                if (node) tabRefs.current.set(id, node)
                else tabRefs.current.delete(id)
              }}
              role="tab"
              tabIndex={active === id ? 0 : -1}
              type="button"
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <button
          aria-label={copyLabel}
          className={cn(
            'ml-auto inline-flex cursor-pointer items-center justify-center',
            'rounded-lg border border-line bg-surface p-1.5',
            'text-muted [&>svg]:size-3.5 [&>svg]:shrink-0',
            'transition-colors duration-200 hover:text-body',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-ring motion-reduce:transition-none',
            copied && 'border-line-success bg-accent-muted text-on-accent'
          )}
          onClick={() => {
            copyToClipboard(landingSnippets[active].source).then((didCopy) => {
              if (!didCopy) return
              setCopied(true)
              window.clearTimeout(copyResetRef.current)
              copyResetRef.current = window.setTimeout(
                () => setCopied(false),
                COPY_FEEDBACK_MS
              )
            }, noop)
          }}
          title={copyLabel}
          type="button"
        >
          {copied ? <IconSuccess /> : <IconCopy />}
        </button>
      </div>

      <div
        aria-labelledby={`${panelId}-tab-${active}`}
        id={panelId}
        role="tabpanel"
      >
        <CodeWindow
          className="landing-code--fixed landing-swap-in"
          key={active}
          snippet={landingSnippets[active]}
        />
      </div>

      <GradeList lang={lang} preview={landingPreviews[active]} />
    </div>
  )
}
