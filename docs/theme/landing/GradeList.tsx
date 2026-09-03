import { useI18n } from '@rspress/core/runtime'
import { useState } from 'react'
import { formatInterval, type LandingPreview } from '@/landing/preview-data'
import { cn } from '@/utils/cn'

// Literal colour classes keep them visible to Tailwind's scanner.
const GRADES = [
  {
    grade: 1,
    labelKey: 'home.grade.again',
    tint: 'text-again',
    rule: 'border-t-again',
  },
  {
    grade: 2,
    labelKey: 'home.grade.hard',
    tint: 'text-hard',
    rule: 'border-t-hard',
  },
  {
    grade: 3,
    labelKey: 'home.grade.good',
    tint: 'text-good',
    rule: 'border-t-good',
  },
  {
    grade: 4,
    labelKey: 'home.grade.easy',
    tint: 'text-easy',
    rule: 'border-t-easy',
  },
] as const

type Props = {
  readonly lang: string
  readonly preview: LandingPreview
}

export function GradeList({ lang, preview }: Props) {
  const t = useI18n<typeof import('i18n')>()
  const [selected, setSelected] = useState<(typeof GRADES)[number]['grade']>(3)
  const row = preview.grades[selected]

  return (
    <div className="border-line border-t">
      <div className="grid grid-cols-4">
        {GRADES.map(({ grade, labelKey, tint, rule }) => {
          const isSelected = grade === selected
          const cell = preview.grades[grade]
          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'flex cursor-default flex-col items-start gap-0.5',
                'border-0 border-t-2 border-l border-t-transparent',
                'border-l-line first:border-l-0',
                'bg-transparent px-3 py-2 text-left',
                'transition-colors duration-200 hover:bg-brand-soft',
                'focus-visible:outline-2 focus-visible:-outline-offset-2',
                'focus-visible:outline-ring motion-reduce:transition-none',
                isSelected && ['bg-surface', rule]
              )}
              key={grade}
              onFocus={() => setSelected(grade)}
              onMouseEnter={() => setSelected(grade)}
              type="button"
            >
              <span
                className={cn(
                  'text-[10.5px] font-bold tracking-[0.08em] uppercase',
                  isSelected ? tint : 'text-subtle'
                )}
              >
                {t(labelKey)}
              </span>
              <span
                className={cn(
                  'font-mono text-[12px] tabular-nums',
                  isSelected ? 'text-body' : 'text-muted'
                )}
              >
                {formatInterval(lang, preview.now, cell.dueAt)}
              </span>
              <span className="font-mono text-[10.5px] text-subtle">
                <span className="sr-only">{t('home.field.status')}: </span>
                {cell.scheduleStatus}
              </span>
            </button>
          )
        })}
      </div>

      <dl
        className="landing-swap-in m-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-line border-t bg-surface px-3 py-2"
        key={selected}
      >
        <div className="flex items-baseline gap-1.5">
          <dt className="text-[11px] text-subtle">
            <span aria-hidden>S</span>
            <span className="sr-only">{t('home.field.stability')}</span>
          </dt>
          <dd className="m-0 font-mono text-[12px] tabular-nums text-body">
            {Number(row.stability.toFixed(4))}
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-[11px] text-subtle">
            <span aria-hidden>D</span>
            <span className="sr-only">{t('home.field.difficulty')}</span>
          </dt>
          <dd className="m-0 font-mono text-[12px] tabular-nums text-body">
            {Number(row.difficulty.toFixed(4))}
          </dd>
        </div>
        {Object.entries(row.extras).map(([field, value]) => (
          <div className="flex items-baseline gap-1.5" key={field}>
            <dt className="font-mono text-[11px] text-accent">{field}</dt>
            <dd className="m-0 font-mono text-[12px] tabular-nums text-body">
              {String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
