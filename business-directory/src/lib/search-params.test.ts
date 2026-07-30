import { describe, expect, it } from 'vitest'
import {
  EMPTY_STATE,
  activeFilterCount,
  hasActiveFilters,
  parseSearchParams,
  searchHref,
  serializeSearchState,
  toQueryParams,
  toggleValue,
  withChange,
  type SearchState,
} from './search-params'

/**
 * The plan's exit criterion for this phase is that a search URL is shareable
 * and restores exactly. That is a round-trip property, so it is tested as one.
 */

const full: SearchState = {
  q: 'chai',
  categories: ['street-food', 'sweets-bakery'],
  city: 'ahmedabad',
  locality: 'navrangpura',
  priceLevels: [1, 2],
  amenities: ['Parking', 'UPI accepted'],
  minRating: 4,
  openNow: true,
  lat: 23.0225,
  lng: 72.5714,
  radiusKm: 5,
  sort: 'nearest',
  page: 3,
}

describe('round trip', () => {
  it('restores a fully populated state exactly', () => {
    const restored = parseSearchParams(
      Object.fromEntries(new URLSearchParams(serializeSearchState(full))),
    )
    expect(restored).toEqual(full)
  })

  it('restores the empty state to the empty state', () => {
    expect(parseSearchParams({})).toEqual(EMPTY_STATE)
    expect(serializeSearchState(EMPTY_STATE)).toBe('')
  })

  it('produces a stable URL for the same state', () => {
    expect(serializeSearchState(full)).toBe(serializeSearchState({ ...full }))
  })

  it('omits defaults rather than spelling them out', () => {
    const qs = serializeSearchState({ ...EMPTY_STATE, q: 'chai' })
    expect(qs).toBe('q=chai')
    expect(qs).not.toContain('sort')
    expect(qs).not.toContain('page')
  })
})

describe('parsing', () => {
  it('ignores an unknown sort instead of passing it through', () => {
    expect(parseSearchParams({ sort: 'cheapest' }).sort).toBe('relevance')
  })

  it('drops out-of-range values rather than clamping them', () => {
    // Clamping would show 5-star results under a filter chip reading "99".
    expect(parseSearchParams({ rating: '99' }).minRating).toBeNull()
    expect(parseSearchParams({ rating: '0' }).minRating).toBeNull()
    expect(parseSearchParams({ lat: '200', lng: '10' }).lat).toBeNull()
    expect(parseSearchParams({ page: '0' }).page).toBe(1)
    expect(parseSearchParams({ page: 'banana' }).page).toBe(1)
  })

  it('keeps only recognised price levels', () => {
    expect(parseSearchParams({ price: '2,9,1,abc' }).priceLevels).toEqual([1, 2])
  })

  it('de-duplicates list facets and preserves order', () => {
    expect(parseSearchParams({ category: 'a,b,a' }).categories).toEqual(['a', 'b'])
  })

  it('treats a lone coordinate as no origin at all', () => {
    const state = parseSearchParams({ lat: '23.02', radius: '5', sort: 'nearest' })
    expect(state.lat).toBeNull()
    expect(state.lng).toBeNull()
    expect(state.radiusKm).toBeNull()
    // `nearest` cannot be honoured without an origin, so it must not be claimed.
    expect(state.sort).toBe('relevance')
  })

  it('discards a radius with no origin', () => {
    expect(parseSearchParams({ radius: '5' }).radiusKm).toBeNull()
  })

  it('reads open-now only from the exact flag value', () => {
    expect(parseSearchParams({ open: '1' }).openNow).toBe(true)
    expect(parseSearchParams({ open: 'true' }).openNow).toBe(false)
    expect(parseSearchParams({}).openNow).toBe(false)
  })

  it('takes the first value when a param is repeated', () => {
    expect(parseSearchParams({ q: ['chai', 'coffee'] }).q).toBe('chai')
  })

  it('treats a whitespace-only query as absent', () => {
    expect(parseSearchParams({ q: '   ' }).q).toBeNull()
  })
})

describe('withChange', () => {
  it('resets to page 1 when a filter changes', () => {
    expect(withChange({ ...full, page: 7 }, { minRating: 3 }).page).toBe(1)
  })

  it('keeps the page when paging explicitly', () => {
    expect(withChange({ ...full, page: 7 }, { page: 8 }).page).toBe(8)
  })

  it('drops radius and nearest sort when the origin is cleared', () => {
    const next = withChange(full, { lat: null, lng: null })
    expect(next.radiusKm).toBeNull()
    expect(next.sort).toBe('relevance')
  })

  it('cannot build a state the URL could not round-trip', () => {
    const next = withChange(full, { lat: null })
    const restored = parseSearchParams(
      Object.fromEntries(new URLSearchParams(serializeSearchState(next))),
    )
    expect(restored).toEqual(next)
  })
})

describe('toggleValue', () => {
  it('adds a missing value and removes a present one', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('filter summaries', () => {
  it('reports no active filters for the empty state', () => {
    expect(hasActiveFilters(EMPTY_STATE)).toBe(false)
    expect(activeFilterCount(EMPTY_STATE)).toBe(0)
  })

  it('does not count sort or page as filters', () => {
    const state = { ...EMPTY_STATE, sort: 'rating' as const, page: 4 }
    expect(hasActiveFilters(state)).toBe(false)
    expect(activeFilterCount(state)).toBe(0)
  })

  it('counts each active facet once', () => {
    expect(activeFilterCount(full)).toBe(9)
  })
})

describe('toQueryParams', () => {
  it('sends undefined rather than empty values so SQL defaults apply', () => {
    const params = toQueryParams(EMPTY_STATE)
    expect(params.query).toBeUndefined()
    expect(params.categorySlugs).toBeUndefined()
    expect(params.priceLevels).toBeUndefined()
    expect(params.minRating).toBeUndefined()
    expect(params.openNow).toBe(false)
  })

  it('passes every active facet through', () => {
    const params = toQueryParams(full)
    expect(params).toMatchObject({
      query: 'chai',
      categorySlugs: ['street-food', 'sweets-bakery'],
      citySlug: 'ahmedabad',
      localitySlug: 'navrangpura',
      priceLevels: [1, 2],
      amenities: ['Parking', 'UPI accepted'],
      minRating: 4,
      openNow: true,
      lat: 23.0225,
      lng: 72.5714,
      radiusKm: 5,
      sort: 'nearest',
      page: 3,
    })
  })
})

describe('searchHref', () => {
  it('omits the query string entirely when nothing is set', () => {
    expect(searchHref('en', EMPTY_STATE)).toBe('/en/search')
  })

  it('includes the locale prefix', () => {
    expect(searchHref('hi', { ...EMPTY_STATE, q: 'chai' })).toBe('/hi/search?q=chai')
  })
})
