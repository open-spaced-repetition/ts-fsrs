import { cn } from '@/utils/cn'

/**
 * Class lists shared by the playground surfaces.
 *
 * Every component that renders them carries `rp-not-doc`: Rspress styles prose
 * with unlayered rules, which outrank Tailwind utilities, so without opting out
 * the documentation typography wins over anything set here.
 */

export const button = cn(
  'min-h-9 cursor-pointer rounded-[10px] border border-line bg-panel',
  'px-3.25 py-1.75 text-xs font-[680] text-body [font-family:inherit]',
  'transition-[transform,border-color,background] duration-[120ms] ease-out',
  'enabled:hover:-translate-y-px enabled:hover:border-line-strong',
  'focus-visible:outline-3 focus-visible:outline-offset-2',
  'focus-visible:outline-ring',
  'disabled:cursor-progress disabled:opacity-60',
  'motion-reduce:transition-none'
)

export const primaryButton = cn(
  'border-transparent bg-linear-[135deg,var(--color-brand),#7d55db]',
  'text-white shadow-primary'
)

export const actionButton = cn(
  button,
  'playground-action inline-flex items-center justify-center',
  '[&>svg]:size-4 [&>svg]:shrink-0'
)

export const logLine = cn(
  'm-0 border-0 bg-transparent px-3.5 py-2 font-mono text-xs/[1.6]',
  'break-words whitespace-pre-wrap text-body',
  'data-[level=warn]:text-warning data-[level=error]:text-danger'
)

/** Separates consecutive transcript lines without bordering the first one. */
export const logDivider = 'border-t border-dashed border-line'

export const field = 'grid gap-1.5 text-[13px] font-[650] text-body'

export const control = cn(
  'min-h-9.5 w-full rounded-[9px] border border-line',
  'bg-surface px-2.5 py-1.75 font-medium text-body [font:inherit]',
  'focus:border-brand focus:outline-2 focus:outline-offset-1',
  'focus:outline-ring',
  'disabled:cursor-not-allowed disabled:opacity-65'
)

export const checkbox = cn(
  'size-4.5 min-h-4.5 cursor-pointer p-0 accent-brand',
  'disabled:cursor-not-allowed disabled:opacity-65'
)

export const tableCell = 'border border-line px-2.5 py-2 text-left align-top'

/** Rspress styles links and inline code only inside documentation prose. */
export const link = cn(
  'border-b-0 font-medium text-link no-underline',
  'transition-colors duration-200 hover:text-brand'
)

export const inlineCode = cn(
  'rounded border border-line bg-code-bg px-1 py-0.5',
  'font-mono text-[0.875em] text-code'
)

export const resultBlock = cn(
  'mt-2 mb-0 max-h-80 overflow-auto rounded-lg border border-line',
  'bg-surface p-2.5 font-mono text-xs break-words whitespace-pre-wrap'
)
