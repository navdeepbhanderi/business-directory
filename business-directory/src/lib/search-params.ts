import type { SearchParams } from '@/lib/queries/businesses'

/**
 * The URL is the single source of truth for search state.
 *
 * Everything here is pure and round-trippable: `parse(serialize(x)) === x`.
 * That is what makes a result page shareable, the back button correct, and the
 * whole surface work without JavaScript. The prototype kept filter state in a
 * component, wrote it to the URL on mount, and immediately overwrote incoming
 * params with nulls — which is why linking to a category silently showed
 * everything.
 */

export const SORT_OPTIONS = ['relevance', 'rating', 'reviews', 'nearest', 'newest'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const PRICE_LEVELS = [1, 2, 3, 4] as const

/** Offered radii in km. `null` means "no distance limit". */
export const RADIUS_OPTIONS = [1, 2, 5, 10, 25] as const

export const DEFAULT_PAGE_SIZE = 12

export type SearchState = {
  q: string | null
  categories: string[]
  city: string | null
  locality: string | null
  priceLevels: number[]
  amenities: string[]
  minRating: number | null
  openNow: boolean
  /** Present only as a pair; a lone coordinate is meaningless. */
  lat: number | null
  lng: number | null
  radiusKm: number | null
  sort: SortOption
  page: number
}

export const EMPTY_STATE: SearchState = {
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
  sort: 'relevance',
  page: 1,
}

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Comma-separated lists, de-duplicated, order preserved. */
function list(value: string | string[] | undefined): string[] {
  const raw = first(value)
  if (!raw) return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ]
}

function boundedNumber(
  value: string | undefined,
  { min, max, integer = false }: { min: number; max: number; integer?: boolean },
): number | null {
  if (value === undefined) return null
  const parsed = integer ? Number.parseInt(value, 10) : Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed < min || parsed > max) return null
  return parsed
}

/**
 * Parses raw query params into validated state.
 *
 * Out-of-range and malformed values are dropped rather than clamped: a URL
 * asking for `minRating=99` is a mistake or a probe, and silently treating it
 * as 5 would show results that contradict the visible filter.
 */
export function parseSearchParams(raw: RawParams): SearchState {
  const lat = boundedNumber(first(raw.lat), { min: -90, max: 90 })
  const lng = boundedNumber(first(raw.lng), { min: -180, max: 180 })
  const hasOrigin = lat !== null && lng !== null

  const sortRaw = first(raw.sort)
  const sort = SORT_OPTIONS.find((option) => option === sortRaw) ?? 'relevance'

  const priceLevels = list(raw.price)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => (PRICE_LEVELS as readonly number[]).includes(value))
    .sort((a, b) => a - b)

  const radiusKm = boundedNumber(first(raw.radius), { min: 0.1, max: 100 })

  return {
    q: first(raw.q) ?? null,
    categories: list(raw.category),
    city: first(raw.city) ?? null,
    locality: first(raw.locality) ?? null,
    priceLevels,
    amenities: list(raw.amenity),
    minRating: boundedNumber(first(raw.rating), { min: 1, max: 5 }),
    openNow: first(raw.open) === '1',
    lat: hasOrigin ? lat : null,
    lng: hasOrigin ? lng : null,
    // A radius without an origin cannot be applied, so it is not retained.
    radiusKm: hasOrigin ? radiusKm : null,
    // `nearest` is meaningless without an origin; fall back rather than mislead.
    sort: sort === 'nearest' && !hasOrigin ? 'relevance' : sort,
    page: boundedNumber(first(raw.page), { min: 1, max: 1000, integer: true }) ?? 1,
  }
}

/**
 * Serialises state back to a query string, omitting anything at its default.
 * Keys are emitted in a fixed order so the same state always produces the same
 * URL — which keeps cache keys and shared links stable.
 */
export function serializeSearchState(state: SearchState): string {
  const params = new URLSearchParams()

  if (state.q) params.set('q', state.q)
  if (state.categories.length) params.set('category', state.categories.join(','))
  if (state.city) params.set('city', state.city)
  if (state.locality) params.set('locality', state.locality)
  if (state.priceLevels.length) params.set('price', state.priceLevels.join(','))
  if (state.amenities.length) params.set('amenity', state.amenities.join(','))
  if (state.minRating !== null) params.set('rating', String(state.minRating))
  if (state.openNow) params.set('open', '1')

  if (state.lat !== null && state.lng !== null) {
    // Six decimals is roughly 0.1 m — more precision is noise and makes URLs
    // needlessly unique, which fragments the cache.
    params.set('lat', state.lat.toFixed(6))
    params.set('lng', state.lng.toFixed(6))
    if (state.radiusKm !== null) params.set('radius', String(state.radiusKm))
  }

  if (state.sort !== 'relevance') params.set('sort', state.sort)
  if (state.page > 1) params.set('page', String(state.page))

  return params.toString()
}

export function searchHref(locale: string, state: SearchState): string {
  const qs = serializeSearchState(state)
  return `/${locale}/search${qs ? `?${qs}` : ''}`
}

/**
 * Applies a partial change. Any change other than paging resets to page 1 —
 * landing on page 7 of a freshly narrowed result set is disorienting and often
 * empty.
 */
export function withChange(state: SearchState, change: Partial<SearchState>): SearchState {
  const next = { ...state, ...change }
  if (!('page' in change)) next.page = 1

  // Keep the invariants parse() guarantees, so a UI-built state cannot express
  // something the URL cannot round-trip.
  if (next.lat === null || next.lng === null) {
    next.lat = null
    next.lng = null
    next.radiusKm = null
    if (next.sort === 'nearest') next.sort = 'relevance'
  }
  return next
}

/** Toggles one value in an array-valued facet. */
export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}

export function hasActiveFilters(state: SearchState): boolean {
  return Boolean(
    state.q ||
    state.categories.length ||
    state.city ||
    state.locality ||
    state.priceLevels.length ||
    state.amenities.length ||
    state.minRating !== null ||
    state.openNow ||
    state.lat !== null,
  )
}

export function activeFilterCount(state: SearchState): number {
  return [
    state.q,
    state.categories.length > 0,
    state.city,
    state.locality,
    state.priceLevels.length > 0,
    state.amenities.length > 0,
    state.minRating !== null,
    state.openNow,
    state.lat !== null,
  ].filter(Boolean).length
}

/** Maps validated state onto the query layer's parameter shape. */
export function toQueryParams(state: SearchState): SearchParams {
  return {
    query: state.q ?? undefined,
    categorySlugs: state.categories.length ? state.categories : undefined,
    citySlug: state.city ?? undefined,
    localitySlug: state.locality ?? undefined,
    priceLevels: state.priceLevels.length ? state.priceLevels : undefined,
    amenities: state.amenities.length ? state.amenities : undefined,
    minRating: state.minRating ?? undefined,
    openNow: state.openNow,
    lat: state.lat ?? undefined,
    lng: state.lng ?? undefined,
    radiusKm: state.radiusKm ?? undefined,
    sort: state.sort,
    page: state.page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}
