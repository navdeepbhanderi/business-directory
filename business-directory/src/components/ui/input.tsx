import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'rounded-control border-line-strong bg-surface text-ink h-10 w-full border px-3 text-sm',
        'placeholder:text-ink-muted',
        'hover:border-ink-muted transition-colors duration-(--duration-hover)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'rounded-control border-line-strong bg-surface text-ink min-h-24 w-full border px-3 py-2 text-sm',
        'placeholder:text-ink-muted',
        'hover:border-ink-muted transition-colors duration-(--duration-hover)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  )
}
