import { cn } from '@/utils/cn'

export const section =
  'mx-auto w-full max-w-[72rem] px-5 py-14 sm:px-6 sm:py-18'

export const eyebrow =
  'text-center text-[11px] font-bold tracking-[0.18em] text-brand uppercase'

export const heading = cn(
  'mt-2.5 text-center text-[clamp(1.45rem,3.2vw,2.05rem)]/[1.25]',
  'font-bold text-balance text-body'
)

export const lede =
  'mx-auto mt-3 max-w-2xl text-center text-sm/6 text-pretty text-muted'

export const card = cn(
  'rounded-2xl border border-line bg-surface p-5',
  'transition-colors duration-200 hover:border-line-strong',
  'motion-reduce:transition-none'
)

// Weight is the caller's: `cn` is plain clsx, so two `font-[…]` would both apply.
export const outlinedAction = cn(
  'rounded-xl border border-line bg-surface px-4 py-2',
  'text-[13px] text-body no-underline',
  'transition-colors duration-200 hover:border-line-strong',
  'motion-reduce:transition-none'
)

export const cardTitle = 'text-[15px] font-[680] text-body'
export const cardBody = 'mt-1.5 text-[13px]/[1.6] text-pretty text-muted'

export const codeWindow =
  'overflow-hidden rounded-2xl border border-line bg-panel shadow-playground'

export const windowBar = cn(
  'flex items-center gap-1 border-b border-line bg-header px-2 py-1.5'
)

export const tab = cn(
  'cursor-pointer rounded-lg border border-transparent bg-transparent',
  'px-2.5 py-1 font-mono text-[11.5px] font-[650] text-muted',
  'transition-colors duration-200 hover:text-body',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'aria-selected:border-line aria-selected:bg-surface aria-selected:text-body',
  'motion-reduce:transition-none'
)

export const node =
  'rounded-xl border border-line bg-surface px-3 py-2 text-center'

export const nodeTitle = 'block font-mono text-[12.5px] font-[680] text-body'
export const nodeMeta = 'mt-0.5 block text-[11px] text-subtle'

export const staticChip = cn(
  'rounded-full border border-line bg-surface px-2.5 py-1',
  'font-mono text-[11px] font-[650] text-muted'
)
