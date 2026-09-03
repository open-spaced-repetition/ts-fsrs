import { type MouseEvent, type ReactNode, useState } from 'react'
import { cn } from '@/utils/cn'
import { useReducedMotion } from './useReducedMotion'

type Props = {
  readonly children: ReactNode
  readonly className?: string
  readonly radius?: string
}

type Motion = {
  readonly perspective: number
  readonly rotateX: number
  readonly rotateY: number
  readonly shineX: number
  readonly shineY: number
}

export function FeatureCardMotion({
  children,
  className,
  radius = 'rounded-2xl',
}: Props) {
  const [motion, setMotion] = useState<Motion | null>(null)
  const reduced = useReducedMotion()

  function move(event: MouseEvent<HTMLDivElement>) {
    if (reduced) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    setMotion({
      perspective: rect.width * 2,
      rotateX: (0.5 - y) * 6,
      rotateY: (x - 0.5) * 8,
      shineX: x * 100,
      shineY: y * 100,
    })
  }

  // Inline styles win over any `motion-reduce:` utility.
  const active = reduced ? null : motion

  return (
    // Pointer movement changes decoration only; any action belongs to children.
    // biome-ignore lint/a11y/noStaticElementInteractions: decorative motion
    <div
      className={className}
      onMouseLeave={() => setMotion(null)}
      onMouseMove={move}
      style={{ perspective: active ? `${active.perspective}px` : undefined }}
    >
      <div
        className="relative h-full transition-transform duration-150 ease-out"
        style={{
          transform: `rotateX(${active?.rotateX ?? 0}deg) rotateY(${active?.rotateY ?? 0}deg)`,
        }}
      >
        {children}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity duration-150',
            radius
          )}
          style={{
            background: `radial-gradient(circle at ${active?.shineX ?? 50}% ${active?.shineY ?? 50}%, rgba(255, 255, 255, 0.12), transparent 45%)`,
            opacity: active ? 0.6 : 0,
          }}
        />
      </div>
    </div>
  )
}
