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

export function SchedulerWorkbench() {
  const t = useI18n<typeof import('i18n')>()
  const lang = useLang()
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('default')
  const [copied, setCopied] = useState(false)
  const copyResetRef = useRef<number>(undefined)
  const panelId = useId()
  const copyLabel = copied ? t('home.copied') : t('home.copy')

  useEffect(() => () => window.clearTimeout(copyResetRef.current), [])

  return (
    <div
      className={cn('rp-not-doc w-full max-w-2xl', styles.codeWindow)}
      style={{ '--landing-code-lines': CODE_LINES } as CSSProperties}
    >
      <div className={styles.windowBar} role="tablist">
        {TABS.map(({ id, labelKey }) => (
          <button
            aria-controls={`${panelId}-${id}`}
            aria-selected={active === id}
            className={styles.tab}
            id={`${panelId}-tab-${id}`}
            key={id}
            onClick={() => {
              setActive(id)
              setCopied(false)
            }}
            role="tab"
            type="button"
          >
            {t(labelKey)}
          </button>
        ))}
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
            void copyToClipboard(landingSnippets[active].source).then(() => {
              setCopied(true)
              window.clearTimeout(copyResetRef.current)
              copyResetRef.current = window.setTimeout(
                () => setCopied(false),
                2400
              )
            })
          }}
          title={copyLabel}
          type="button"
        >
          {copied ? <IconSuccess /> : <IconCopy />}
        </button>
      </div>

      <div
        aria-labelledby={`${panelId}-tab-${active}`}
        id={`${panelId}-${active}`}
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
