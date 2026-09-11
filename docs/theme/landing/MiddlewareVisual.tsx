import { useI18n } from '@rspress/core/runtime'
import { FeatureCardMotion } from './FeatureCardMotion'
import { Section } from './Section'
import * as styles from './styles'

const BUILT_INS = [
  'stats',
  'desiredRetention',
  'fuzzing',
  'learningSteps',
  'leech',
  'maximumInterval',
  'monotonicInterval',
  'scheduledDays',
] as const

export function MiddlewareVisual() {
  const t = useI18n<typeof import('i18n')>()

  return (
    <Section
      eyebrow={t('home.middleware.eyebrow')}
      title={t('home.middleware.title')}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUILT_INS.map((name) => (
          <FeatureCardMotion className="h-full" key={name}>
            <article className={`${styles.card} h-full`}>
              <h3 className={styles.cardTitle}>
                {name[0].toUpperCase() + name.slice(1)}
              </h3>
              <p className={styles.cardBody}>
                {t(`home.middleware.builtin.${name}`)}
              </p>
            </article>
          </FeatureCardMotion>
        ))}
      </div>
    </Section>
  )
}
