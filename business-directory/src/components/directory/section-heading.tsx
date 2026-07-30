import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && <span className="text-eyebrow text-accent">{eyebrow}</span>}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {description && <p className="text-ink-muted max-w-prose">{description}</p>}
      </div>
      {action}
    </div>
  )
}
