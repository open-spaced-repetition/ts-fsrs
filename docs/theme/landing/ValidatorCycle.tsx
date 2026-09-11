import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'
import * as styles from './styles'
import { useReducedMotion } from './useReducedMotion'

const VALIDATORS = ['zod', 'valibot', 'arktype', 'built-in'] as const
const DWELL_MS = 2800

// One updater: deriving either index inside the other's would make it impure.
type Slide = {
  readonly index: number
  readonly previous: number | null
}

export function ValidatorCycle() {
  const [{ index, previous }, setSlide] = useState<Slide>({
    index: 0,
    previous: null,
  })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      setSlide((slide) => ({
        index: (slide.index + 1) % VALIDATORS.length,
        previous: slide.index,
      }))
    }, DWELL_MS)
    return () => clearInterval(id)
  }, [reduced])

  if (reduced) {
    return <span className={styles.nodeMeta}>{VALIDATORS.join(' · ')}</span>
  }

  return (
    <span
      className={cn(
        styles.nodeMeta,
        'grid min-w-20 justify-items-center *:[grid-area:1/1]'
      )}
    >
      {previous !== null && (
        <span className="landing-swap-out" key={`out-${previous}-${index}`}>
          {VALIDATORS[previous]}
        </span>
      )}
      <span className="landing-swap-in" key={`in-${index}`}>
        {VALIDATORS[index]}
      </span>
    </span>
  )
}
