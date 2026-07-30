import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SearchX } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { getCategories, searchBusinesses, type SearchParams } from '@/lib/queries/businesses'
import { localizedText, interpolate } from '@/lib/i18n-content'
import { formatCount } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BusinessCard } from '@/components/directory/business-card'
import { EmptyState } from '@/components/directory/empty-state'

/**
 * Search results.
 *
 * Phase 2 wires the query, category, city, sort, and pagination that the RPC
 * already supports, with the URL as the single source of truth. The richer
 * filter surface — geolocation radius, price, amenities, open-now toggle, and
 * the map — is Phase 3.
 */

const PAGE_SIZE = 12

function parseSort(value: string | undefined): SearchParams['sort'] {
  const allowed = ['relevance', 'rating', 'reviews', 'nearest', 'newest'] as const
  return allowed.find((option) => option === value)
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const query = await searchParams
  const dict = await getDictionary(locale)
  const base = `/${locale}`

  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

  const q = first(query.q)?.trim() || undefined
  const category = first(query.category)
  const city = first(query.city)
  const sort = parseSort(first(query.sort))
  const page = Math.max(1, Number(first(query.page) ?? '1') || 1)

  const [categories, results] = await Promise.all([
    getCategories(),
    searchBusinesses({
      query: q,
      categorySlugs: category ? [category] : undefined,
      citySlug: city,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  ])

  const categoryLabel = new Map(
    categories.map((c) => [c.slug, localizedText(c.name, c.name_i18n, locale)]),
  )

  const cardLabels = {
    verified: dict.business.verified,
    reviews: dict.business.reviews,
    promoted: dict.business.promoted,
    openNow: dict.business.openNow,
    closed: dict.business.closed,
  }

  /** Preserves every active parameter while changing one. */
  const urlWith = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const current = { q, category, city, sort, page: page > 1 ? String(page) : undefined }
    for (const [key, value] of Object.entries({ ...current, ...overrides })) {
      if (value !== undefined && value !== '') next.set(key, String(value))
    }
    const qs = next.toString()
    return `${base}/search${qs ? `?${qs}` : ''}`
  }

  const activeFilters = [
    category ? { key: 'category', label: categoryLabel.get(category) ?? category } : null,
    city ? { key: 'city', label: city } : null,
  ].filter((f): f is { key: string; label: string } => f !== null)

  const countLabel = interpolate(
    results.total === 1 ? dict.search.resultCount : dict.search.resultCountPlural,
    { count: formatCount(results.total, locale) },
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl sm:text-3xl">
          {q ? interpolate(dict.search.resultsFor, { query: q }) : dict.search.allListings}
        </h1>
        <p className="num text-ink-muted text-sm">{countLabel}</p>

        {activeFilters.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <li key={filter.key}>
                <Link href={urlWith({ [filter.key]: undefined, page: undefined })}>
                  <Badge variant="accent" className="gap-1.5 py-1">
                    {filter.label}
                    <span aria-hidden>×</span>
                    <span className="sr-only">{dict.search.clearAll}</span>
                  </Badge>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`${base}/search`}
                className="text-ink-muted hover:text-ink text-sm underline-offset-4 hover:underline"
              >
                {dict.search.clearAll}
              </Link>
            </li>
          </ul>
        )}
      </header>

      {/* Sort. A plain link set, so it works without JavaScript and every
          combination is a shareable URL. */}
      <nav aria-label={dict.search.sortBy} className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-ink-muted text-sm">{dict.search.sortBy}</span>
        {(['relevance', 'rating', 'reviews', 'newest'] as const).map((option) => {
          const active = (sort ?? 'relevance') === option
          return (
            <Link
              key={option}
              href={urlWith({ sort: option === 'relevance' ? undefined : option, page: undefined })}
              aria-current={active ? 'true' : undefined}
              className={
                active
                  ? 'rounded-pill bg-accent-soft text-accent px-3 py-1 text-sm font-medium'
                  : 'rounded-pill border-line text-ink-muted hover:border-line-strong hover:text-ink border px-3 py-1 text-sm transition-colors duration-(--duration-hover)'
              }
            >
              {dict.search.sort[option]}
            </Link>
          )
        })}
      </nav>

      {results.items.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<SearchX />}
          title={dict.search.empty.title}
          body={dict.search.empty.body}
          action={
            <Button asChild variant="outline">
              <Link href={`${base}/search`}>{dict.search.empty.action}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((row) => (
              <BusinessCard
                key={row.id}
                locale={locale}
                labels={cardLabels}
                href={`${base}/business/${row.slug}`}
                business={{
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

          {results.pageCount > 1 && (
            <nav
              aria-label="Pagination"
              className="border-line mt-10 flex items-center justify-between gap-4 border-t pt-6"
            >
              {page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={urlWith({ page: String(page - 1) })} rel="prev">
                    ←
                  </Link>
                </Button>
              ) : (
                <span />
              )}

              <span className="num text-ink-muted text-sm">
                {page} / {results.pageCount}
              </span>

              {page < results.pageCount ? (
                <Button asChild variant="outline">
                  <Link href={urlWith({ page: String(page + 1) })} rel="next">
                    →
                  </Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
