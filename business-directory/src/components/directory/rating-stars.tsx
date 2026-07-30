import { Star } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { formatCount, formatRating } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Presentational rating components — deliberately NOT client components.
 *
 * The interactive input lives in `rating-input.tsx`. Keeping them apart matters
 * for more than bundle size: a `'use client'` file cannot accept function props
 * from a Server Component, and having these in the same module as the stateful
 * input made every label prop a runtime error waiting to happen.
 *
 * Related: props here are strings, never callbacks, so these stay safe to use
 * on either side of the boundary.
 */

const sizeClass = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-6',
} as const

/**
 * Partial fills use a clipped overlay rather than rounding, so 4.5 reads as
 * four and a half stars instead of five.
 */
export function RatingStars({
  value,
  locale,
  count,
  size = 'md',
  showValue = true,
  className,
}: {
  value: number
  locale: Locale
  count?: number
  size?: keyof typeof sizeClass
  showValue?: boolean
  className?: string
}) {
  const clamped = Math.min(Math.max(value, 0), 5)
  const label =
    count === undefined
      ? `${formatRating(clamped, locale)} / 5`
      : `${formatRating(clamped, locale)} / 5 · ${formatCount(count, locale)}`

  return (
    // `role="img"` is required: a bare <span> has no role, and ARIA prohibits
    // aria-label on roleless generic elements (axe: aria-prohibited-attr).
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      <span className="relative inline-flex" aria-hidden>
        <span className="inline-flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={cn(sizeClass[size], 'text-line-strong')} />
          ))}
        </span>
        <span
          className="absolute inset-0 inline-flex overflow-hidden"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={cn(sizeClass[size], 'fill-star text-star shrink-0')} />
          ))}
        </span>
      </span>
      {showValue && (
        <span className="num text-ink text-sm font-medium">{formatRating(clamped, locale)}</span>
      )}
    </span>
  )
}

/**
 * Distribution bars. Answers "is this a 4.2 because everyone agrees, or because
 * half loved it and half hated it" — which a single average cannot.
 */
export function RatingBreakdown({
  counts,
  locale,
  starLabels,
  className,
}: {
  counts: Record<1 | 2 | 3 | 4 | 5, number>
  locale: Locale
  /** Pre-localised label per star, e.g. `{ 5: '5 stars', 1: '1 star' }`. */
  starLabels: Record<1 | 2 | 3 | 4 | 5, string>
  className?: string
}) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const share = total === 0 ? 0 : (counts[star] / total) * 100
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="num text-ink-muted w-10 shrink-0">{starLabels[star]}</span>
            <div
              className="rounded-pill bg-surface-sunken h-1.5 flex-1 overflow-hidden"
              role="img"
              aria-label={`${starLabels[star]}: ${formatCount(counts[star], locale)}`}
            >
              <div className="rounded-pill bg-star h-full" style={{ width: `${share}%` }} />
            </div>
            <span className="num text-ink-muted w-8 shrink-0 text-end">
              {formatCount(counts[star], locale)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
