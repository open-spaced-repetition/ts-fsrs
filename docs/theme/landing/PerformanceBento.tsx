import { useI18n } from '@rspress/core/runtime'
import { cn } from '@/utils/cn'
import { FeatureCardMotion } from './FeatureCardMotion'
import { Section } from './Section'
import * as styles from './styles'

const CARDS = [
  { titleKey: 'home.perf.split.title', bodyKey: 'home.perf.split.body' },
  {
    titleKey: 'home.perf.lazyPreview.title',
    bodyKey: 'home.perf.lazyPreview.body',
  },
  {
    titleKey: 'home.perf.lazySchema.title',
    bodyKey: 'home.perf.lazySchema.body',
  },
  {
    titleKey: 'home.perf.treeShaking.title',
    bodyKey: 'home.perf.treeShaking.body',
  },
  {
    titleKey: 'home.perf.immutable.title',
    bodyKey: 'home.perf.immutable.body',
  },
  { titleKey: 'home.perf.rollback.title', bodyKey: 'home.perf.rollback.body' },
] as const

export function PerformanceBento() {
  const t = useI18n<typeof import('i18n')>()

  return (
    <Section
      description={t('home.perf.description')}
      eyebrow={t('home.perf.eyebrow')}
      title={t('home.perf.title')}
    >
      <div className="landing-stagger grid gap-4 md:grid-cols-3">
        {CARDS.map(({ titleKey, bodyKey }) => (
          <FeatureCardMotion className="h-full" key={titleKey}>
            <div className={cn(styles.card, 'h-full')}>
              <h3 className={styles.cardTitle}>{t(titleKey)}</h3>
              <p className={styles.cardBody}>{t(bodyKey)}</p>
            </div>
          </FeatureCardMotion>
        ))}
      </div>
    </Section>
  )
}
