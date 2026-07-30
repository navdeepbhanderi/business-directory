import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Heart } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireUser } from '@/lib/auth'
import { getFavorites } from '@/lib/queries/saved'
import { localizedText, interpolate } from '@/lib/i18n-content'
import { formatCount } from '@/lib/format'
import { BusinessCard } from '@/components/directory/business-card'
import { EmptyState } from '@/components/directory/empty-state'
import { CardActions } from '@/components/saved/card-actions'
import { SavedNav } from '@/components/saved/saved-nav'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Saved places.
 *
 * Signed-in only, so dynamic — which is why the cards here can be read with the
 * cookie-bound client while the same cards on public pages cannot.
 */
export default async function SavedPlacesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  await requireUser(locale, `/${locale}/account/saved`)
  const dict = await getDictionary(locale)
  const { items, total } = await getFavorites()

  const cardLabels = {
    verified: dict.business.verified,
    reviews: dict.business.reviews,
    promoted: dict.business.promoted,
    openNow: dict.business.openNow,
    closed: dict.business.closed,
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-display">{dict.saved.heading}</h1>
      </header>

      <SavedNav
        locale={locale}
        active="places"
        labels={{
          places: dict.saved.tabPlaces,
          lists: dict.saved.tabLists,
          searches: dict.saved.tabSearches,
        }}
      />

      {items.length === 0 ? (
        <EmptyState icon={<Heart />} title={dict.saved.placesHeading} body={dict.saved.placesEmpty} />
      ) : (
        <>
          <p className="num text-ink-muted text-sm">
            {interpolate(dict.saved.placesCount, { count: formatCount(total, locale) })}
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((row) => {
              const name = localizedText(row.name, row.name_i18n, locale)
              return (
                <BusinessCard
                  key={row.id}
                  locale={locale}
                  labels={cardLabels}
                  href={`/${locale}/business/${row.slug}`}
                  actions={
                    <CardActions
                      businessId={row.id}
                      businessName={name}
                      locale={locale}
                      dict={dict}
                    />
                  }
                  business={{
                    id: row.id,
                    slug: row.slug,
                    name,
                    cityName: row.city_name,
                    localityName: row.locality_name,
                    addressLine1: row.address_line1,
                    rating: Number(row.rating),
                    reviewCount: row.review_count,
                    priceLevel: row.price_level,
                    amenities: [],
                    verified: row.verified,
                    distanceKm: null,
                    isOpen: row.is_open,
                    promoted: false,
                    categoryLabels: [],
                    photoUrl: row.photo_url,
                  }}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
