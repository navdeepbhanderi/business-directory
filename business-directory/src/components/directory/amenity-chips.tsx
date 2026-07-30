import { interpolate } from '@/lib/i18n-content'
import { cn } from '@/lib/utils'

/**
 * Amenities are the tie-breaker between two similar listings — parking, UPI,
 * home delivery. Shown as plain chips with an overflow count rather than a
 * scrolling row, so the card height stays predictable in a grid.
 */
export function AmenityChips({
  amenities,
  max = 3,
  moreLabel,
  className,
}: {
  amenities: string[]
  max?: number
  /** Template containing `{count}`. */
  moreLabel: string
  className?: string
}) {
  if (amenities.length === 0) return null
  const shown = amenities.slice(0, max)
  const hidden = amenities.length - shown.length

  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {shown.map((amenity) => (
        <li
          key={amenity}
          className="rounded-pill border-line text-ink-muted border px-2.5 py-0.5 text-xs"
        >
          {amenity}
        </li>
      ))}
      {hidden > 0 && (
        <li className="rounded-pill text-ink-muted px-2.5 py-0.5 text-xs">
          {interpolate(moreLabel, { count: hidden })}
        </li>
      )}
    </ul>
  )
}
