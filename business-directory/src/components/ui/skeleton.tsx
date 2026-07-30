import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Skeletons mirror the shape of what is loading. A generic grey block that
 * does not match the eventual layout causes a visible jump on load, which is
 * worse than showing nothing.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-control bg-surface-sunken animate-pulse', className)}
      aria-hidden
      {...props}
    />
  )
}
