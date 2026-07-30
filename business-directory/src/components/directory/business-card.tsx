import Link from 'next/link'
import type { ReactNode } from 'react'
import { BadgeCheck, MapPin, Megaphone } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { formatCount, formatDistance, priceLevelSymbol } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RatingStars } from './rating-stars'

export type BusinessCardLabels = {
  verified: string
  reviews: string
  promoted: string
  openNow: string
  closed: string
}

export type BusinessCardData = {
  /** Used by the map/list hover sync to address this card. */
  id: string
  slug: string
  name: string
  cityName: string
  localityName: string | null
  addressLine1: string
  rating: number
  reviewCount: number
  priceLevel: number | null
  amenities: string[]
  verified: boolean
  distanceKm: number | null
  isOpen: boolean
  promoted: boolean
  categoryLabels: string[]
  photoUrl?: string | null
}

/**
 * The unit of the whole product. Everything it shows answers a question
 * someone scanning a results page is actually asking: is it any good, is it
 * near me, is it open, roughly what does it cost, and can I trust the listing.
 *
 * The entire card is one link — the prototype's version had no click handler at
 * all, so search results could not reach a listing.
 */
export function BusinessCard({
  business,
  locale,
  labels,
  href,
  variant = 'grid',
  actions,
  className,
}: {
  business: BusinessCardData
  locale: Locale
  labels: BusinessCardLabels
  href: string
  variant?: 'grid' | 'list'
  /**
   * Viewer-specific controls — save, add to a list — rendered over the photo.
   *
   * A slot rather than props so this stays a Server Component: the controls are
   * client islands passed in as elements, and a card with no viewer state (an OG
   * image, a shared list seen by a stranger) simply passes nothing.
   */
  actions?: ReactNode
  className?: string
}) {
  const distance = formatDistance(business.distanceKm, locale)
  const place = [business.localityName, business.cityName].filter(Boolean).join(', ')

  return (
    <article
      data-business-id={business.id}
      className={cn(
        'group rounded-card border-line bg-surface shadow-card relative border',
        'hover:border-line-strong transition-colors duration-(--duration-hover)',
        'focus-within:outline-ring focus-within:outline focus-within:outline-2 focus-within:outline-offset-2',
        variant === 'list' && 'sm:flex sm:items-stretch',
        className,
      )}
    >
      <div
        className={cn(
          'bg-surface-sunken relative overflow-hidden',
          variant === 'grid'
            ? 'rounded-t-card aspect-[16/10]'
            : 'rounded-t-card sm:rounded-s-card aspect-[16/10] sm:aspect-square sm:w-44 sm:shrink-0 sm:rounded-e-none',
        )}
      >
        {business.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/image lands with Storage-backed photos in Phase 8
          <img
            src={business.photoUrl}
            alt=""
            className="size-full object-cover transition-transform duration-(--duration-enter) group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <span className="font-display text-line-strong flex size-full items-center justify-center text-4xl">
            {business.name.charAt(0)}
          </span>
        )}

        {/* Above the stretched link, which covers the whole card. */}
        {actions && <div className="absolute end-3 top-3 z-10 flex gap-1.5">{actions}</div>}

        {business.promoted && (
          <span className="rounded-pill bg-surface/90 text-ink-muted absolute start-3 top-3 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium backdrop-blur">
            <Megaphone className="size-3" aria-hidden />
            {labels.promoted}
          </span>
        )}
      </div>

      {/* A container query, not a viewport one: the same card sits in a wide
          grid cell on the home page and a ~250px column beside the map, and only
          its own width can decide whether the "Verified" label fits. */}
      <div className="@container flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base leading-snug">
            {/* Stretched link: the whole card is the target, but only the name
                is in the accessibility tree as a link. */}
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {business.name}
            </Link>
          </h3>
          {business.verified && (
            <span
              className="text-accent inline-flex shrink-0 items-center gap-1 text-xs font-medium"
              title={labels.verified}
            >
              <BadgeCheck className="size-4" aria-hidden />
              <span className="sr-only @[20rem]:not-sr-only">{labels.verified}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <RatingStars value={business.rating} locale={locale} size="sm" showValue />
          <span className="num text-ink-muted">({formatCount(business.reviewCount, locale)})</span>
          {business.priceLevel !== null && (
            <>
              <span className="text-line-strong" aria-hidden>
                ·
              </span>
              <span className="num text-ink-muted">{priceLevelSymbol(business.priceLevel)}</span>
            </>
          )}
        </div>

        <p className="text-ink-muted flex items-center gap-1.5 text-sm">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{place}</span>
          {distance && (
            <>
              <span className="text-line-strong" aria-hidden>
                ·
              </span>
              <span className="num shrink-0">{distance}</span>
            </>
          )}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium',
              business.isOpen ? 'text-success' : 'text-ink-muted',
            )}
          >
            <span
              className={cn(
                'rounded-pill size-1.5',
                business.isOpen ? 'bg-success' : 'bg-line-strong',
              )}
              aria-hidden
            />
            {business.isOpen ? labels.openNow : labels.closed}
          </span>

          {business.categoryLabels.slice(0, 2).map((label) => (
            <span key={label} className="text-ink-muted text-sm">
              {label}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

export function BusinessCardSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'list' }) {
  return (
    <div
      className={cn(
        'rounded-card border-line bg-surface shadow-card border',
        variant === 'list' && 'sm:flex',
      )}
      aria-hidden
    >
      <div
        className={cn(
          'bg-surface-sunken animate-pulse',
          variant === 'grid'
            ? 'rounded-t-card aspect-[16/10]'
            : 'rounded-t-card sm:rounded-s-card aspect-[16/10] sm:aspect-square sm:w-44 sm:shrink-0 sm:rounded-e-none',
        )}
      />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="rounded-control bg-surface-sunken h-5 w-2/3 animate-pulse" />
        <div className="rounded-control bg-surface-sunken h-4 w-1/2 animate-pulse" />
        <div className="rounded-control bg-surface-sunken h-4 w-3/4 animate-pulse" />
        <div className="rounded-control bg-surface-sunken mt-1 h-4 w-1/3 animate-pulse" />
      </div>
    </div>
  )
}
