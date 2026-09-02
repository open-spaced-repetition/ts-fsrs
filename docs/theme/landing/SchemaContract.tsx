import { useI18n } from '@rspress/core/runtime'
import { cn } from '@/utils/cn'
import { FeatureCardMotion } from './FeatureCardMotion'
import { Section } from './Section'
import * as styles from './styles'
import { ValidatorCycle } from './ValidatorCycle'

export function SchemaContract() {
  const t = useI18n<typeof import('i18n')>()

  return (
    <Section
      description={t('home.schema.description')}
      eyebrow={t('home.schema.eyebrow')}
      title={t('home.schema.title')}
    >
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ul className="m-0 grid list-none gap-3 p-0">
          {(
            [
              'home.schema.point.source',
              'home.schema.point.mutability',
              'home.schema.point.status',
            ] as const
          ).map((key) => (
            <li className={cn(styles.cardBody, 'mt-0')} key={key}>
              {t(key)}
            </li>
          ))}
        </ul>

        <FeatureCardMotion>
          <div className={cn(styles.card, 'h-full p-6')}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(styles.node, 'border-line-brand bg-brand-soft')}
              >
                <span className={styles.nodeTitle}>StandardSchemaV1</span>
                <ValidatorCycle />
              </div>
              <div className="h-4 w-px bg-line" aria-hidden />
              <div className="grid w-full grid-cols-3 gap-2">
                {['Model', 'Chrono', 'Middleware'].map((name) => (
                  <div className={styles.node} key={name}>
                    <span className={styles.nodeTitle}>{name}</span>
                  </div>
                ))}
              </div>
              <div className="h-4 w-px bg-line" aria-hidden />
              <div className="grid w-full grid-cols-2 gap-2">
                <div className={styles.node}>
                  <span className={styles.nodeTitle}>Readonly&lt;Card&gt;</span>
                  <span className={styles.nodeMeta}>
                    {t('home.schema.input')}
                  </span>
                </div>
                <div className={cn(styles.node, 'border-line-accent')}>
                  <span className={styles.nodeTitle}>Mutable&lt;Card&gt;</span>
                  <span className={styles.nodeMeta}>
                    {t('home.schema.output')}
                  </span>
                </div>
              </div>
              <p className="mt-3 mb-0 text-center font-mono text-[11.5px] text-muted">
                scheduleStatus: 'new' | 'review' | 'suspended'
              </p>
            </div>
          </div>
        </FeatureCardMotion>
      </div>
    </Section>
  )
}
