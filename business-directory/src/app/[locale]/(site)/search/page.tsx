import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SearchX } from 'lucide-react'
import { getMarket, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import {
  getAmenityFacets,
  getCategories,
  getCities,
  getLocalityFacets,
  searchBusinesses,
} from '@/lib/queries/businesses'
import {
  DEFAULT_PAGE_SIZE,
  parseSearchParams,
  searchHref,
  serializeSearchState,
  toQueryParams,
  withChange,
  type SearchState,
} from '@/lib/search-params'
import { localizedText, interpolate } from '@/lib/i18n-content'
import { formatCount } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { BusinessCard, BusinessCardSkeleton } from '@/components/directory/business-card'
import { EmptyState } from '@/components/directory/empty-state'
import { ActiveFilterChips, FilterPanel, SortLinks } from '@/components/directory/filter-bar'
import { NearMeButton } from '@/components/directory/near-me-button'
import { ResultsView } from '@/components/directory/results-view'
import { CardActions, favoriteLabels } from '@/components/saved/card-actions'
import { SaveSearchButton } from '@/components/saved/save-search-button'

/**
 * Search.
 *
 * Every facet is a link, so the URL is the only state and the page works with
 * JavaScript disabled. The results block is wrapped in Suspense and streamed:
 * the filter surface and heading paint immediately while the query runs.
 */

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const state = parseSearchParams(await searchParams)
  const dict = await getDictionary(locale)

  const [categories, cities, amenities, localities] = await Promise.all([
    getCategories(),
    getCities(),
    getAmenityFacets(state.city ?? undefined),
    state.city ? getLocalityFacets(state.city, locale) : Promise.resolve([]),
  ])

  const filterData = {
    categories: categories.map((c) => ({
      value: c.slug,
      label: localizedText(c.name, c.name_i18n, locale),
    })),
    cities: cities.map((c) => ({
      value: c.slug,
      label: localizedText(c.name, c.name_i18n, locale),
    })),
    localities: localities.map((l) => ({
      value: l.slug,
      label: localizedText(l.name, l.nameI18n, locale),
      count: Number(l.count),
    })),
    amenities: amenities.map((a) => ({
      value: a.amenity,
      label: a.amenity,
      count: Number(a.listing_count),
    })),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl">
            {state.q
              ? interpolate(dict.search.resultsFor, { query: state.q })
              : dict.search.allListings}
          </h1>
          <NearMeButton
            state={state}
            locale={locale}
            labels={{
              nearMe: dict.search.nearMe,
              locating: dict.search.locating,
              denied: dict.search.locationDenied,
            }}
          />
        </div>

        <ActiveFilterChips state={state} data={filterData} locale={locale} dict={dict} />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        {/* Sticky on desktop; a plain block above the results on mobile, which
            keeps it usable without JavaScript. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="text-eyebrow text-ink mb-4">{dict.search.filters}</h2>
          <FilterPanel state={state} data={filterData} locale={locale} dict={dict} />
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SortLinks state={state} locale={locale} dict={dict} />
            <SaveSearchButton
              query={serializeSearchState(state)}
              locale={locale}
              returnTo={searchHref(locale, state)}
              labels={{
                trigger: dict.saved.saveSearch,
                title: dict.saved.saveSearchTitle,
                description: dict.saved.saveSearchDescription,
                nameLabel: dict.saved.nameLabel,
                notify: dict.saved.notifyLabel,
                submit: dict.saved.saveSearch,
                saved: dict.saved.savedChanges,
                signIn: dict.saved.signInToSave,
                anywhere: dict.saved.savedSearchAnywhere,
                openNow: dict.saved.savedSearchOpenNow,
                near: dict.saved.savedSearchNear,
                errors: dict.saved.errors,
              }}
            />
          </div>

          <Suspense key={JSON.stringify(state)} fallback={<ResultsSkeleton />}>
            <Results state={state} locale={locale} dict={dict} filterData={filterData} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-4" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <BusinessCardSkeleton key={index} variant="list" />
      ))}
    </div>
  )
}

async function Results({
  state,
  locale,
  dict,
  filterData,
}: {
  state: SearchState
  locale: 'en' | 'hi'
  dict: Awaited<ReturnType<typeof getDictionary>>
  filterData: {
    categories: { value: string; label: string }[]
  }
}) {
  const results = await searchBusinesses(toQueryParams(state))
  const categoryLabel = new Map(filterData.categories.map((c) => [c.value, c.label]))

  const cardLabels = {
    verified: dict.business.verified,
    reviews: dict.business.reviews,
    promoted: dict.business.promoted,
    openNow: dict.business.openNow,
    closed: dict.business.closed,
  }

  if (results.items.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        icon={<SearchX />}
        title={dict.search.empty.title}
        body={dict.search.empty.body}
        action={
          <Button asChild variant="outline">
            <Link href={searchHref(locale, { ...state, ...clearedState })}>
              {dict.search.empty.action}
            </Link>
          </Button>
        }
      />
    )
  }

  const points = results.items.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating,
    isOpen: row.is_open,
  }))

  return (
    <>
      <p className="num text-ink-muted mt-4 text-sm">
        {interpolate(
          results.total === 1 ? dict.search.resultCount : dict.search.resultCountPlural,
          { count: formatCount(results.total, locale) },
        )}
      </p>

      <div className="mt-6">
        <ResultsView
          points={points}
          bounds={getMarket().bounds}
          origin={
            state.lat !== null && state.lng !== null ? { lat: state.lat, lng: state.lng } : null
          }
          locale={locale}
          // The full search href, so signing in from the map popover comes back
          // to the same filters rather than to a bare /search.
          returnTo={searchHref(locale, state)}
          labels={{
            showMap: dict.search.showMap,
            showList: dict.search.showList,
            unavailable: dict.search.mapUnavailable,
            searchThisArea: dict.search.searchThisArea,
            closePopover: dict.saved.closePopover,
            viewListing: dict.saved.viewListing,
            openNow: dict.business.openNow,
            closed: dict.business.closed,
            favorite: favoriteLabels(dict),
          }}
        >
          {/* One column of horizontal cards rather than a two-up grid: beside
              the map the results column is ~500px, and two columns there forced
              listing names onto three lines. */}
          <div className="flex flex-col gap-4">
            {results.items.map((row) => (
              <BusinessCard
                key={row.id}
                variant="list"
                locale={locale}
                labels={cardLabels}
                href={`/${locale}/business/${row.slug}`}
                actions={
                  <CardActions
                    businessId={row.id}
                    businessName={localizedText(row.name, row.name_i18n, locale)}
                    locale={locale}
                    dict={dict}
                    returnTo={searchHref(locale, state)}
                  />
                }
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
                  amenities: row.amenities,
                  verified: row.verified,
                  distanceKm: row.distance_km,
                  isOpen: row.is_open,
                  promoted: row.promoted,
                  photoUrl: row.photo_url,
                  categoryLabels: row.category_slugs
                    .map((slug) => categoryLabel.get(slug))
                    .filter((label): label is string => Boolean(label)),
                }}
              />
            ))}
          </div>
        </ResultsView>
      </div>

      {results.pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="border-line mt-10 flex items-center justify-between gap-4 border-t pt-6"
        >
          {state.page > 1 ? (
            <Button asChild variant="outline">
              <Link
                href={searchHref(locale, withChange(state, { page: state.page - 1 }))}
                rel="prev"
              >
                ←
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="num text-ink-muted text-sm">
            {state.page} / {results.pageCount}
          </span>
          {state.page < results.pageCount ? (
            <Button asChild variant="outline">
              <Link
                href={searchHref(locale, withChange(state, { page: state.page + 1 }))}
                rel="next"
              >
                →
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  )
}

const clearedState = {
  q: null,
  categories: [],
  city: null,
  locality: null,
  priceLevels: [],
  amenities: [],
  minRating: null,
  openNow: false,
  lat: null,
  lng: null,
  radiusKm: null,
  page: 1,
} satisfies Partial<SearchState>

export { DEFAULT_PAGE_SIZE }
