'use client'

import Link from 'next/link'
import type { MapPoint } from '@/components/directory/results-map'
import { RatingStars } from '@/components/directory/rating-stars'
import { isLocale, defaultLocale } from '@/i18n/config'
import { cn } from '@/lib/utils'
import { FavoriteButton, type FavoriteLabels } from './favorite-button'

/**
 * What a selected pin shows.
 *
 * Deliberately small: the name, whether it is any good, whether it is open, and
 * the two things someone wants to do next — save it, or open it. A pin that only
 * navigates makes the map a slower list.
 */
export function MapPopoverCard({
  point,
  locale,
  returnTo,
  labels,
}: {
  point: MapPoint
  locale: string
  returnTo?: string
  labels: {
    viewListing: string
    openNow: string
    closed: string
    favorite: FavoriteLabels
  }
}) {
  const tag = isLocale(locale) ? locale : defaultLocale

  return (
    <div className="flex items-start gap-3 pe-6">
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-sm font-medium">{point.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <RatingStars value={point.rating} locale={tag} size="sm" showValue />
          <span
            className={cn('text-xs font-medium', point.isOpen ? 'text-success' : 'text-ink-muted')}
          >
            {point.isOpen ? labels.openNow : labels.closed}
          </span>
        </div>
        <Link
          href={`/${tag}/business/${point.slug}`}
          className="text-accent mt-1.5 inline-block text-sm underline-offset-4 hover:underline"
        >
          {labels.viewListing}
        </Link>
      </div>

      <FavoriteButton
        businessId={point.id}
        businessName={point.name}
        locale={tag}
        returnTo={returnTo}
        labels={labels.favorite}
      />
    </div>
  )
}
