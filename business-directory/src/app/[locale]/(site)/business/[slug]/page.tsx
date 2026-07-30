import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, Globe, MapPin, Phone, Tag } from 'lucide-react'
import { getMarket, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { getBusinessBySlug, getBusinessHours, getBusinessReviews } from '@/lib/queries/businesses'
import { localizedText, interpolate } from '@/lib/i18n-content'
import { formatCount, formatPriceRange, formatRelative, priceLevelSymbol } from '@/lib/format'
import { zonedParts } from '@/lib/hours'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RatingBreakdown, RatingStars } from '@/components/directory/rating-stars'
import { HoursTable, OpenNowBadge } from '@/components/directory/open-now-badge'
import { AmenityChips } from '@/components/directory/amenity-chips'

/**
 * Listing detail.
 *
 * Phase 2 delivers the page and its data. The SEO layer that belongs on top of
 * it — JSON-LD, per-listing OG images, sitemap entries, ISR tag invalidation —
 * is Phase 4, and is deliberately not faked here.
 *
 * Contact actions are real `tel:` and `mailto:` links. The prototype rendered
 * them as inert buttons under "Demo only" tooltips.
 */
export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const business = await getBusinessBySlug(slug)
  if (!business) notFound()

  const dict = await getDictionary(locale)
  const [hours, reviews] = await Promise.all([
    getBusinessHours(business.id),
    getBusinessReviews(business.id, { sort: 'newest', limit: 8 }),
  ])

  const name = localizedText(business.name, business.name_i18n, locale)
  const description = business.description
    ? localizedText(business.description, business.description_i18n, locale)
    : null

  const city = business.cities
  const locality = business.localities
  const place = [
    locality ? localizedText(locality.name, locality.name_i18n, locale) : null,
    city ? localizedText(city.name, city.name_i18n, locale) : null,
  ]
    .filter(Boolean)
    .join(', ')

  const categories = business.business_categories
    .map((row) => row.categories)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => localizedText(c.name, c.name_i18n, locale))

  const photos = [...business.business_photos].sort((a, b) => a.sort_order - b.sort_order)
  const services = [...business.services].sort((a, b) => a.sort_order - b.sort_order)
  const today = zonedParts(new Date(), getMarket().timeZone).weekday

  const openLabels = {
    open: dict.business.openNow,
    closed: dict.business.closed,
    unknown: dict.business.hoursUnknown,
    closingSoon: dict.business.closingSoon,
    closesAt: dict.business.closesAt,
    opensAt: dict.business.opensAt,
    opensOn: dict.business.opensOn,
  }

  // Pre-localised so no callback crosses a component boundary.
  const starLabels = {
    1: interpolate(dict.business.starCount, { count: 1 }),
    2: interpolate(dict.business.starCountPlural, { count: 2 }),
    3: interpolate(dict.business.starCountPlural, { count: 3 }),
    4: interpolate(dict.business.starCountPlural, { count: 4 }),
    5: interpolate(dict.business.starCountPlural, { count: 5 }),
  } as const

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="text-ink-muted text-sm">
          <Link href={`/${locale}`} className="hover:text-ink">
            {dict.nav.home}
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          {city && (
            <Link href={`/${locale}/search?city=${city.slug}`} className="hover:text-ink">
              {localizedText(city.name, city.name_i18n, locale)}
            </Link>
          )}
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-display">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <RatingStars
                value={business.rating}
                locale={locale}
                count={business.review_count}
                size="lg"
              />
              <span className="num text-ink-muted text-sm">
                {formatCount(business.review_count, locale)} {dict.business.reviews}
              </span>
              <OpenNowBadge
                slots={hours.slots}
                overrides={hours.overrides}
                locale={locale}
                labels={openLabels}
              />
              {business.price_level !== null && (
                <span className="num text-ink-muted text-sm">
                  {priceLevelSymbol(business.price_level)}
                </span>
              )}
            </div>
            <p className="text-ink-muted flex items-center gap-1.5 text-sm">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {business.address_line1}
              {place && `, ${place}`}
            </p>
          </div>

          {business.verified && (
            <Badge variant="accent" className="gap-1.5 px-3 py-1 text-sm">
              <BadgeCheck className="size-4" aria-hidden />
              {dict.business.verified}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {business.phone && (
            <Button asChild variant="outline">
              <a href={`tel:${business.phone.replace(/\s+/g, '')}`}>
                <Phone />
                {dict.business.call}
              </a>
            </Button>
          )}
          {business.website && (
            <Button asChild variant="outline">
              <a href={business.website} target="_blank" rel="noopener noreferrer">
                <Globe />
                {dict.business.website}
              </a>
            </Button>
          )}
        </div>

        {categories.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {categories.map((label) => (
              <li key={label}>
                <Badge variant="outline">{label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </header>

      {photos.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.slice(0, 3).map((photo) => (
            <li
              key={photo.storage_path}
              className="rounded-card border-line bg-surface-sunken aspect-[4/3] overflow-hidden border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Storage-backed next/image lands in Phase 8 */}
              <img
                src={photo.storage_path}
                alt={photo.alt ?? ''}
                className="size-full object-cover"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-8">
          {description && (
            <section>
              <h2 className="text-xl">{dict.footer.about}</h2>
              <p className="text-ink-muted mt-3 leading-relaxed">{description}</p>
            </section>
          )}

          {business.amenities.length > 0 && (
            <section>
              <h2 className="text-xl">{dict.search.category}</h2>
              <AmenityChips
                amenities={business.amenities}
                max={12}
                moreLabel={dict.business.amenitiesMore}
                className="mt-3"
              />
            </section>
          )}

          {services.length > 0 && (
            <section>
              <h2 className="text-xl">{dict.search.priceLevel}</h2>
              <ul className="divide-line rounded-card border-line bg-surface mt-3 divide-y border">
                {services.map((service) => (
                  <li key={service.id} className="flex items-baseline justify-between gap-4 p-4">
                    <span className="text-ink text-sm">
                      {localizedText(service.name, service.name_i18n, locale)}
                    </span>
                    <span className="num text-ink-muted shrink-0 text-sm">
                      {formatPriceRange(service.price_min, service.price_max, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {business.offers.length > 0 && (
            <section>
              <h2 className="text-xl">{dict.home.featured.eyebrow}</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {business.offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="rounded-card border-line bg-accent-soft flex gap-3 border p-4"
                  >
                    <Tag className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
                    <div>
                      <p className="text-ink font-medium">
                        {localizedText(offer.title, offer.title_i18n, locale)}
                      </p>
                      {offer.description && (
                        <p className="text-ink-muted mt-1 text-sm">{offer.description}</p>
                      )}
                      {offer.terms && <p className="text-ink-muted mt-2 text-xs">{offer.terms}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xl">{dict.business.reviews}</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-[14rem_1fr]">
              <div className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
                <div className="text-center">
                  <p className="num font-display text-4xl">{business.rating.toFixed(1)}</p>
                  <RatingStars
                    value={business.rating}
                    locale={locale}
                    size="sm"
                    showValue={false}
                    className="mt-1 justify-center"
                  />
                  <p className="num text-ink-muted mt-1 text-xs">
                    {formatCount(reviews.total, locale)} {dict.business.reviews}
                  </p>
                </div>
                <RatingBreakdown counts={reviews.counts} locale={locale} starLabels={starLabels} />
              </div>

              <ul className="flex flex-col gap-4">
                {reviews.items.map((review) => (
                  <li key={review.id} className="rounded-card border-line bg-surface border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink text-sm font-medium">
                        {review.author?.full_name ?? '—'}
                      </span>
                      <span className="text-ink-muted text-xs">
                        {formatRelative(review.created_at, locale)}
                      </span>
                    </div>
                    <RatingStars
                      value={review.rating}
                      locale={locale}
                      size="sm"
                      showValue={false}
                      className="mt-2"
                    />
                    <p className="text-ink-muted mt-2 text-sm leading-relaxed">{review.body}</p>
                    {/* One reply per review is a unique constraint, so this is
                        an object rather than an array. */}
                    {review.review_replies && (
                      <div className="rounded-control border-accent bg-surface-sunken mt-3 border-s-2 p-3">
                        <p className="text-accent text-xs font-medium">{name}</p>
                        <p className="text-ink-muted mt-1 text-sm">{review.review_replies.body}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dict.business.hours}</CardTitle>
            </CardHeader>
            <CardContent>
              <HoursTable
                slots={hours.slots}
                overrides={hours.overrides}
                locale={locale}
                today={today}
                todayLabel={dict.business.today}
                closedLabel={dict.business.closed}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </article>
  )
}
