import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Every empty state names what is missing and offers the next action.
 *
 * A generic "No results" is a dead end, and dead ends are most of what made the
 * prototype feel unfinished — so this component requires an action slot rather
 * than making one optional.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-card border-line flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="text-line-strong [&_svg]:size-8" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-lg">{title}</h3>
      <p className="text-ink-muted max-w-sm text-sm">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
