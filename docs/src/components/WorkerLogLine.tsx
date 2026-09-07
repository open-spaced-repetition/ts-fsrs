import { useI18n } from '@rspress/core/runtime'
import { allExpanded, JsonView } from 'react-json-view-lite'
import { parseLogJson } from '@/playground/runner/parse-log-json'
import type { RunnerLog } from '@/playground/runner/protocol'
import { cn } from '@/utils/cn'

// The viewer's own stylesheet is skipped on purpose: Rspress merges every
// imported stylesheet into the site-wide bundle, and its palette is fixed.
// These utilities read from the same theme tokens as the rest of the page, so
// the tree follows the light/dark switch for free.
const VALUE_STYLES = {
  basicChildStyle: 'ml-3.5',
  booleanValue: 'text-accent font-semibold',
  childFieldsContainer: '',
  collapsedContent: "mr-1 text-subtle after:content-['…']",
  // Spacing is reset in theme/index.css so the tree matches indented
  // JSON.stringify output; unlayered rules there outrank utilities here.
  container: 'font-mono text-xs break-words',
  label: 'mr-1 font-semibold text-muted',
  nullValue: 'text-subtle italic',
  numberValue: 'text-accent',
  otherValue: 'text-body',
  punctuation: 'mr-0.5 text-subtle',
  stringValue: 'text-brand',
  stringifyStringValues: false,
  undefinedValue: 'text-subtle italic',
} as const

// The leaves are the point of the output, so nothing is hidden behind a click.
const shouldExpandNode = allExpanded

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  second: '2-digit',
})

type Props = {
  readonly className?: string
  readonly line: RunnerLog
}

function LogTime({ at }: { readonly at: number }) {
  return (
    <time
      className="shrink-0 text-[11px] text-subtle tabular-nums"
      dateTime={new Date(at).toISOString()}
    >
      {TIME_FORMAT.format(at)}
    </time>
  )
}

export default function WorkerLogLine({ className, line }: Props) {
  const t = useI18n<typeof import('i18n')>()
  const json = parseLogJson(line.text)
  const row = cn(className, 'flex items-baseline justify-between gap-3')

  if (!json) {
    return (
      <div className={row} data-level={line.level}>
        <pre className="m-0 min-w-0 border-0 bg-transparent font-[inherit] break-words whitespace-pre-wrap">
          {line.text}
        </pre>
        <LogTime at={line.at} />
      </div>
    )
  }

  return (
    <div
      // Without `rp-not-doc` the viewer's nested <ul> is laid out as prose.
      className={cn(row, 'rp-not-doc', 'playground-log--json')}
      data-level={line.level}
      data-testid="worker-json"
    >
      {/* The tree is the flexible column: without `min-w-0` a wide value would
          push the timestamp off the edge instead of wrapping. */}
      <div className="min-w-0 flex-1">
        <JsonView
          data={json}
          shouldExpandNode={shouldExpandNode}
          style={{
            ...VALUE_STYLES,
            ariaLables: {
              collapseJson: t('playground.jsonCollapse'),
              expandJson: t('playground.jsonExpand'),
            },
            clickableLabel: 'mr-1 cursor-pointer font-semibold text-muted',
            collapseIcon:
              "mr-1 cursor-pointer select-none text-accent after:content-['▾']",
            expandIcon:
              "mr-1 cursor-pointer select-none text-accent after:content-['▸']",
          }}
        />
      </div>
      <LogTime at={line.at} />
    </div>
  )
}
