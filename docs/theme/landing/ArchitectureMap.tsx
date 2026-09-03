import { useI18n } from '@rspress/core/runtime'
import { cn } from '@/utils/cn'
import { BranchConnector } from './BranchConnector'
import { FeatureCardMotion } from './FeatureCardMotion'
import { Section } from './Section'
import * as styles from './styles'

const COLUMNS = [
  {
    titleKey: 'home.architecture.models',
    items: ['FSRS-3', 'FSRS-4', 'FSRS-4.5', 'FSRS-5', 'FSRS-6', 'defineModel'],
  },
  {
    titleKey: 'home.architecture.chrono',
    items: [
      'dateChrono',
      'numericChrono',
      'temporalInstantChrono',
      'defineChrono',
    ],
  },
  {
    titleKey: 'home.architecture.middleware',
    items: [
      'learningSteps',
      'desiredRetention',
      'fuzzing',
      'leech',
      'stats',
      'defineMiddleware',
    ],
  },
] as const

export function ArchitectureMap() {
  const t = useI18n<typeof import('i18n')>()

  return (
    <Section
      className="bg-surface-soft dark:bg-panel"
      description={t('home.architecture.description')}
      eyebrow={t('home.architecture.eyebrow')}
      title={t('home.architecture.title')}
    >
      <div className="landing-stagger grid gap-4 md:grid-cols-3">
        {COLUMNS.map(({ titleKey, items }) => (
          <FeatureCardMotion className="h-full" key={titleKey}>
            <div className={cn(styles.card, 'h-full')}>
              <h3 className={styles.cardTitle}>{t(titleKey)}</h3>
              <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                {items.map((item) => (
                  <li key={item}>
                    <span className={styles.staticChip}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FeatureCardMotion>
        ))}
      </div>

      <BranchConnector />

      <div className="mt-0 flex flex-col items-center">
        <div className="h-6 w-px bg-line-strong md:hidden" aria-hidden />
        <FeatureCardMotion radius="rounded-xl">
          <div
            className={cn(
              styles.node,
              'border-line-brand bg-brand-soft px-5 py-2.5'
            )}
          >
            <span className={styles.nodeTitle}>Scheduler Core</span>
            <span className={styles.nodeMeta}>
              newCard · preview · review · rollback
            </span>
          </div>
        </FeatureCardMotion>
        <div className="h-6 w-px bg-line-strong" aria-hidden />
        <FeatureCardMotion radius="rounded-xl">
          <div className={cn(styles.node, 'px-5 py-2.5')}>
            <span className={styles.nodeTitle}>
              Card + Revlog + ScheduleStatus
            </span>
          </div>
        </FeatureCardMotion>
        <div className="h-6 w-px bg-line-strong" aria-hidden />
      </div>

      <div className="flex flex-col items-center">
        <span className={styles.staticChip}>definition</span>
        <div className="relative h-6 w-56" aria-hidden>
          <div className="absolute top-0 left-1/2 h-3 w-px bg-line-strong" />
          <div className="absolute top-3 right-1/4 left-1/4 h-px bg-line-strong" />
          <div className="absolute top-3 left-1/4 h-3 w-px bg-line-strong" />
          <div className="absolute top-3 right-1/4 h-3 w-px bg-line-strong" />
        </div>
        <div className="flex gap-8">
          <span className={styles.staticChip}>.use(fuzzing)</span>
          <span className={styles.staticChip}>.use(learningSteps)</span>
        </div>
        <p className={cn(styles.lede, 'mt-3')}>
          {t('home.architecture.immutable')}
        </p>
      </div>
    </Section>
  )
}
