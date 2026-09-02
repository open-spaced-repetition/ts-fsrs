import { useEffect, useState, useSyncExternalStore } from 'react'
import { cn } from '@/utils/cn'
import * as styles from './styles'

const VALIDATORS = ['zod', 'valibot', 'arktype', 'built-in'] as const
const DWELL_MS = 2800
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

const getServerReducedMotion = () => false

export function ValidatorCycle() {
  const [index, setIndex] = useState(0)
  const [previous, setPrevious] = useState<number | null>(null)
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion
  )

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      setIndex((value) => {
        setPrevious(value)
        return (value + 1) % VALIDATORS.length
      })
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
