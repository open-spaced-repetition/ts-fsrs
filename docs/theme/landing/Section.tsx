import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import * as styles from './styles'

type Props = {
  readonly eyebrow: string
  readonly title: string
  readonly description?: string
  readonly children: ReactNode
  readonly className?: string
}

export function Section({
  eyebrow,
  title,
  description,
  children,
  className,
}: Props) {
  return (
    <section className={cn('rp-not-doc', className)}>
      <div className={styles.section}>
        <div className="landing-reveal">
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.heading}>{title}</h2>
          {description && <p className={styles.lede}>{description}</p>}
        </div>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  )
}
