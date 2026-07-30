import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, Globe, MapPin, Navigation, Phone, Tag } from 'lucide-react'
import { getMarket, isLocale, locales, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import {
  getBusinessBySlug,
  getBusinessHours,
  getNearbyBusinesses,
  getPublishedReviews,
  getPublishedSlugs,
  getRatingDistribution,
} from '@/lib/queries/businesses'
import { ReviewsSection } from '@/components/reviews/reviews-section'
import { localizedText, interpolate } from '@/lib/i18n-content'
import {
  formatCount,
  formatDistance,
  formatPriceRange,
  priceLevelSymbol,
} from '@/lib/format'
import { zonedParts } from '@/lib/hours'
import {
  absoluteUrl,
  alternateLanguages,
  breadcrumbJsonLd,
  businessJsonLd,
  jsonLdGraph,
  localePath,
  reviewsJsonLd,
} from '@/lib/seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RatingStars } from '@/components/directory/rating-stars'
import { HoursTable, OpenNowBadge } from '@/components/directory/open-now-badge'
import { AmenityChips } from '@/components/directory/amenity-chips'
import { PhotoGallery } from '@/components/directory/photo-gallery'
import { ListingMap } from '@/components/directory/listing-map'
import { BusinessCard } from '@/components/directory/business-card'

/**
 * Listing detail — the indexable surface, and the reason the whole project
 * bothers with server rendering.
 *
 * Statically generated at build time and revalidated hourly. Possible only
 * because the query layer uses the cookie-free anon client; reading cookies
 * would force this route dynamic and forfeit the caching entirely.
 */

export const revalidate = 3600

/**
 * Pre-renders every published listing.
 *
 * `dynamicParams` stays on (the default), so a listing published after the last
 * build is rendered on demand and cached rather than 404ing until redeploy.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs()
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })))
}

async function load(locale: Locale, slug: string) {
  const business = await getBusinessBySlug(slug)
  if (!business) return null

  // Every one of these uses the cookie-free anon client, which is what keeps this
  // page in the prerender. Reading the session here — directly or through a
  // helper — would turn all 200 listing pages dynamic.
  const [dict, hours, reviews, distribution, nearby] = await Promise.all([
    getDictionary(locale),
    getBusinessHours(business.id),
    getPublishedReviews(business.id, { sort: 'newest', limit: 10 }),
    getRatingDistribution(business.id),
    getNearbyBusinesses(business.id, 4),
  ])

  return { business, dict, hours, reviews, distribution, nearby }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}

  const business = await getBusinessBySlug(slug)
  if (!business) return {}

  const dict = await getDictionary(locale)
  const name = localizedText(business.name, business.name_i18n, locale)
  const city = business.cities
  const locality = business.localities
  const place = [
    locality ? localizedText(locality.name, locality.name_i18n, locale) : null,
    city ? localizedText(city.name, city.name_i18n, locale) : null,
  ]
    .filter(Boolean)
    .join(', ')

  const description = interpolate(dict.business.metaDescription, {
    name,
    place,
    rating: business.rating.toFixed(1),
    count: business.review_count,
  })

  const path = `/business/${slug}`

  return {
    title: `${name} · ${place}`,
    description,
    alternates: {
      canonical: absoluteUrl(localePath(locale, path)),
      languages: alternateLanguages(path),
    },
    openGraph: {
      type: 'website',
      title: name,
      description,
      url: absoluteUrl(localePath(locale, path)),
      // `images` is deliberately NOT set. Next appends a content-hashed URL for
      // the colocated `opengraph-image.tsx` automatically; setting it here
      // overrode that with a guessed path (`.../opengraph-image`) which 404s,
      // because the real route carries a hash suffix.
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const loaded = await load(locale, slug)
  if (!loaded) notFound()

  const { business, dict, hours, reviews, distribution, nearby } = loaded

  const name = localizedText(business.name, business.name_i18n, locale)
  const description = business.description
    ? localizedText(business.description, business.description_i18n, locale)
    : null

  const city = business.cities
  const locality = business.localities
  const cityName = city ? localizedText(city.name, city.name_i18n, locale) : ''
  const localityName = locality ? localizedText(locality.name, locality.name_i18n, locale) : null
  const place = [localityName, cityName].filter(Boolean).join(', ')

  const categories = business.business_categories
    .map((row) => row.categories)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => ({ slug: c.slug, label: localizedText(c.name, c.name_i18n, locale) }))

  const photos = [...business.business_photos]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((photo) => ({ url: photo.storage_path, alt: photo.alt }))

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


  const directionsUrl =
    business.latitude !== null && business.longitude !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
      : null

  // ---- Structured data -----------------------------------------------------
  const graph = jsonLdGraph([
    businessJsonLd(
      {
        slug: business.slug,
        name,
        description,
        addressLine1: business.address_line1,
        addressLine2: business.address_line2,
        postalCode: business.postal_code,
        cityName,
        localityName,
        state: city?.state ?? null,
        countryCode: getMarket().code,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        email: business.email,
        website: business.website,
        priceLevel: business.price_level,
        rating: business.rating,
        reviewCount: business.review_count,
        photoUrls: photos.map((photo) => photo.url),
        hours: hours.slots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          opens: slot.opens.slice(0, 5),
          closes: slot.closes.slice(0, 5),
        })),
        categories: categories.map((category) => category.label),
      },
      locale,
    ),
    ...reviewsJsonLd(
      reviews.items.slice(0, 5).map((review) => ({
        authorName: review.author_name ?? 'Anonymous',
        rating: review.rating,
        body: review.body,
        createdAt: review.created_at,
      })),
    ),
    breadcrumbJsonLd(
      [
        { name: dict.nav.home, path: '' },
        ...(city ? [{ name: cityName, path: `/search?city=${city.slug}` }] : []),
        { name, path: `/business/${business.slug}` },
      ],
      locale,
    ),
  ])

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Escaped by jsonLdGraph, so an owner-controlled name cannot break out. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: graph }} />

      <header className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="text-ink-muted text-sm">
          <Link href={`/${locale}`} className="hover:text-ink">
            {dict.nav.home}
          </Link>
          {city && (
            <>
              <span className="mx-2" aria-hidden>
                /
              </span>
              <Link href={`/${locale}/search?city=${city.slug}`} className="hover:text-ink">
                {cityName}
              </Link>
            </>
          )}
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-display">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {business.review_count > 0 ? (
                <>
                  <RatingStars
                    value={business.rating}
                    locale={locale}
                    count={business.review_count}
                    size="lg"
                  />
                  <span className="num text-ink-muted text-sm">
                    {formatCount(business.review_count, locale)} {dict.business.reviews}
                  </span>
                </>
              ) : (
                <span className="text-ink-muted text-sm">{dict.business.noReviewsYet}</span>
              )}
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

        {/* Real actions. The prototype rendered these as inert buttons under
            "Demo only" tooltips. */}
        <div className="flex flex-wrap gap-2">
          {business.phone && (
            <Button asChild variant="outline">
              <a href={`tel:${business.phone.replace(/\s+/g, '')}`}>
                <Phone />
                {dict.business.call}
              </a>
            </Button>
          )}
          {directionsUrl && (
            <Button asChild variant="outline">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation />
                {dict.business.directions}
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
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/${locale}/search?category=${category.slug}`}>
                  <Badge variant="outline" className="hover:border-line-strong">
                    {category.label}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      {photos.length > 0 && (
        <section className="mt-8">
          <h2 className="sr-only">{dict.business.photos}</h2>
          <PhotoGallery
            photos={photos}
            alt={name}
            labels={{
              open: dict.business.viewPhoto,
              close: dict.business.closePhoto,
              previous: dict.business.previousPhoto,
              next: dict.business.nextPhoto,
              counter: dict.business.photoCounter,
            }}
          />
        </section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-8">
          {description && (
            <section>
              <h2 className="text-xl">{dict.business.about}</h2>
              <p className="text-ink-muted mt-3 leading-relaxed">{description}</p>
            </section>
          )}

          {business.amenities.length > 0 && (
            <section>
              <h2 className="text-xl">{dict.business.features}</h2>
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
              <h2 className="text-xl">{dict.business.services}</h2>
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
              <h2 className="text-xl">{dict.business.offers}</h2>
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

          <ReviewsSection
            businessId={business.id}
            businessSlug={business.slug}
            locale={locale}
            dict={dict}
            reviews={reviews.items}
            total={distribution.total}
            counts={distribution.counts}
            averageRating={business.rating}
          />
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

          {business.latitude !== null && business.longitude !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{dict.business.location}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ListingMap
                  latitude={business.latitude}
                  longitude={business.longitude}
                  name={name}
                />
                {directionsUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation />
                      {dict.business.directions}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {nearby.length > 0 && (
        <section className="border-line mt-14 border-t pt-10">
          <h2 className="text-2xl">{dict.business.nearby}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((row) => (
              <BusinessCard
                key={row.id}
                locale={locale}
                labels={{
                  verified: dict.business.verified,
                  reviews: dict.business.reviews,
                  promoted: dict.business.promoted,
                  openNow: dict.business.openNow,
                  closed: dict.business.closed,
                }}
                href={`/${locale}/business/${row.slug}`}
                business={{
                  id: row.id,
                  slug: row.slug,
                  name: localizedText(row.name, row.name_i18n, locale),
                  cityName: row.city_name,
                  localityName: row.locality_name,
                  addressLine1: row.address_line1,
                  rating: row.rating,
                  reviewCount: row.review_count,
                  priceLevel: row.price_level,
                  amenities: [],
                  verified: row.verified,
                  distanceKm: row.distance_km,
                  isOpen: row.is_open,
                  promoted: false,
                  photoUrl: row.photo_url,
                  categoryLabels: [],
                }}
              />
            ))}
          </div>
          <p className="num text-ink-muted mt-4 text-xs">
            {formatDistance(nearby[0]?.distance_km ?? null, locale)}
          </p>
        </section>
      )}
    </article>
  )
}
