import { type MouseEvent, type ReactNode, useState } from 'react'

type Props = {
  readonly children: ReactNode
  readonly className?: string
}

type Motion = {
  readonly perspective: number
  readonly rotateX: number
  readonly rotateY: number
  readonly shineX: number
  readonly shineY: number
}

/** Lightweight tilt and light response aligned with Rspress HomeFeature. */
export function FeatureCardMotion({ children, className }: Props) {
  const [motion, setMotion] = useState<Motion | null>(null)

  function move(event: MouseEvent<HTMLDivElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotion(null)
      return
    }
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

  return (
    // Pointer movement changes decoration only; the card exposes no action.
    // biome-ignore lint/a11y/noStaticElementInteractions: decorative motion
    <div
      className={className}
      onMouseLeave={() => setMotion(null)}
      onMouseMove={move}
      style={{ perspective: motion ? `${motion.perspective}px` : undefined }}
    >
      <div
        className="relative h-full transition-transform duration-150 ease-out motion-reduce:transform-none"
        style={{
          transform: `rotateX(${motion?.rotateX ?? 0}deg) rotateY(${motion?.rotateY ?? 0}deg)`,
        }}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-150 motion-reduce:!opacity-0"
          style={{
            background: `radial-gradient(circle at ${motion?.shineX ?? 50}% ${motion?.shineY ?? 50}%, rgba(255, 255, 255, 0.12), transparent 45%)`,
            opacity: motion ? 0.6 : 0,
          }}
        />
      </div>
    </div>
  )
}
