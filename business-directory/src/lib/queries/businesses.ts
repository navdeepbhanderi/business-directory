import { createSupabasePublicClient } from '@/lib/supabase/public'
import type { Database } from '@/types/database'
import type { Locale } from '@/i18n/config'

/**
 * Typed data access for **public** listing data.
 *
 * Deliberately uses the anonymous, cookie-free client. Two reasons:
 *
 * 1. Reading `cookies()` opts a route out of static rendering, so the
 *    cookie-bound client was silently forcing every public page to render
 *    dynamically — including listing pages, where being cached and indexable is
 *    the whole point.
 * 2. As `anon` to Postgres, RLS makes it *impossible* for these functions to
 *    return an unpublished listing. The guarantee is structural, not a
 *    convention someone has to remember.
 *
 * Anything personalised — favourites, an owner's drafts, moderation queues —
 * belongs in a separate module using `lib/supabase/server.ts`.
 */

type SearchArgs = Database['public']['Functions']['search_businesses']['Args']
export type SearchRow = Database['public']['Functions']['search_businesses']['Returns'][number]

export type SearchParams = {
  query?: string
  categorySlugs?: string[]
  citySlug?: string
  localitySlug?: string
  lat?: number
  lng?: number
  radiusKm?: number
  minRating?: number
  priceLevels?: number[]
  amenities?: string[]
  openNow?: boolean
  sort?: 'relevance' | 'rating' | 'reviews' | 'nearest' | 'newest'
  page?: number
  pageSize?: number
}

export type SearchResult = {
  items: SearchRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/** Drops undefined keys so PostgREST falls back to the SQL defaults. */
function toArgs(params: SearchParams): SearchArgs {
  const args: SearchArgs = {}
  if (params.query) args.p_query = params.query
  if (params.categorySlugs?.length) args.p_category_slugs = params.categorySlugs
  if (params.citySlug) args.p_city_slug = params.citySlug
  if (params.localitySlug) args.p_locality_slug = params.localitySlug
  if (params.lat !== undefined) args.p_lat = params.lat
  if (params.lng !== undefined) args.p_lng = params.lng
  if (params.radiusKm !== undefined) args.p_radius_km = params.radiusKm
  if (params.minRating !== undefined) args.p_min_rating = params.minRating
  if (params.priceLevels?.length) args.p_price_levels = params.priceLevels
  if (params.amenities?.length) args.p_amenities = params.amenities
  if (params.openNow) args.p_open_now = true
  if (params.sort) args.p_sort = params.sort
  if (params.page !== undefined) args.p_page = params.page
  if (params.pageSize !== undefined) args.p_page_size = params.pageSize
  return args
}

export async function searchBusinesses(params: SearchParams = {}): Promise<SearchResult> {
  const supabase = createSupabasePublicClient()
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20

  const { data, error } = await supabase.rpc('search_businesses', toArgs(params))
  if (error) throw new Error(`search_businesses failed: ${error.message}`)

  const items = data ?? []
  // total_count is a window function over the pre-pagination set, so every row
  // carries the same value; an empty page legitimately means zero matches.
  const total = items[0]?.total_count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getCategories() {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, name_i18n, icon, sort_order')
    .eq('active', true)
    .order('sort_order')

  if (error) throw new Error(`getCategories failed: ${error.message}`)
  return data
}

export async function getCities() {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from('cities')
    .select('id, slug, name, name_i18n, state, population_rank')
    .eq('active', true)
    .order('population_rank', { nullsFirst: false })

  if (error) throw new Error(`getCities failed: ${error.message}`)
  return data
}

/** Weekly hours for a listing, shaped for the client-side hours helpers. */
export async function getBusinessHours(businessId: string) {
  const supabase = createSupabasePublicClient()

  const [hours, overrides] = await Promise.all([
    supabase
      .from('business_hours')
      .select('day_of_week, opens, closes')
      .eq('business_id', businessId)
      .order('day_of_week'),
    supabase
      .from('hours_overrides')
      .select('on_date, closed, opens, closes, note')
      .eq('business_id', businessId)
      .gte('on_date', new Date().toISOString().slice(0, 10))
      .order('on_date')
      .limit(5),
  ])

  if (hours.error) throw new Error(`getBusinessHours failed: ${hours.error.message}`)
  if (overrides.error) throw new Error(`getBusinessHours failed: ${overrides.error.message}`)

  return {
    slots: (hours.data ?? []).map((row) => ({
      dayOfWeek: row.day_of_week as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      opens: row.opens,
      closes: row.closes,
    })),
    overrides: (overrides.data ?? []).map((row) => ({
      date: row.on_date,
      closed: row.closed,
      opens: row.opens,
      closes: row.closes,
      note: row.note,
    })),
  }
}

/**
 * A single listing with everything the detail page renders.
 *
 * Returns null rather than throwing when the slug does not resolve — which
 * includes the case where the listing exists but RLS hides it, so an
 * unpublished listing is indistinguishable from a missing one to a visitor.
 */
export async function getBusinessBySlug(slug: string) {
  const supabase = createSupabasePublicClient()

  const { data, error } = await supabase
    .from('businesses')
    .select(
      `
      id, slug, name, name_i18n, description, description_i18n,
      address_line1, address_line2, postal_code, phone, email, website,
      price_level, amenities, rating, review_count, verified, status,
      cities ( slug, name, name_i18n ),
      localities ( slug, name, name_i18n ),
      business_photos ( storage_path, alt, sort_order ),
      services ( id, name, name_i18n, price_min, price_max, currency, duration_min, sort_order ),
      offers ( id, title, title_i18n, description, valid_from, valid_to, terms ),
      business_categories ( categories ( slug, name, name_i18n ) )
      `,
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`getBusinessBySlug failed: ${error.message}`)
  return data
}

export type BusinessDetail = NonNullable<Awaited<ReturnType<typeof getBusinessBySlug>>>

/**
 * Published reviews plus the star distribution.
 *
 * The `profiles` embed needs an explicit foreign-key hint: `review_votes` joins
 * reviews to profiles as well, so PostgREST sees two possible relationships and
 * refuses to guess. Naming the constraint removes the ambiguity.
 */
export async function getBusinessReviews(
  businessId: string,
  options: { sort?: 'newest' | 'highest' | 'lowest' | 'helpful'; limit?: number } = {},
) {
  const supabase = createSupabasePublicClient()
  const limit = options.limit ?? 10

  const query = supabase
    .from('reviews')
    .select(
      `
      id, rating, body, created_at, edited_at,
      author:profiles!reviews_author_id_fkey ( full_name, avatar_url ),
      review_replies ( body, created_at ),
      review_votes ( user_id )
      `,
    )
    .eq('business_id', businessId)
    .eq('status', 'published')
    .limit(limit)

  switch (options.sort) {
    case 'highest':
      void query.order('rating', { ascending: false })
      break
    case 'lowest':
      void query.order('rating', { ascending: true })
      break
    default:
      void query.order('created_at', { ascending: false })
  }

  const [reviews, distribution] = await Promise.all([
    query,
    supabase
      .from('reviews')
      .select('rating')
      .eq('business_id', businessId)
      .eq('status', 'published'),
  ])

  if (reviews.error) throw new Error(`getBusinessReviews failed: ${reviews.error.message}`)
  if (distribution.error)
    throw new Error(`getBusinessReviews failed: ${distribution.error.message}`)

  const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const row of distribution.data ?? []) {
    const star = row.rating as 1 | 2 | 3 | 4 | 5
    if (star >= 1 && star <= 5) counts[star] += 1
  }

  const items = (reviews.data ?? []).map((row) => ({
    ...row,
    // Sorting by vote count in SQL would need an aggregate join; the page size
    // is small enough that sorting the fetched page is honest and cheaper.
    helpfulCount: row.review_votes?.length ?? 0,
  }))

  if (options.sort === 'helpful') {
    items.sort((a, b) => b.helpfulCount - a.helpfulCount)
  }

  return { items, counts, total: distribution.data?.length ?? 0 }
}

/** Slugs of every published listing — used by generateStaticParams. */
export async function getPublishedSlugs(limit = 1000) {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from('businesses')
    .select('slug')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getPublishedSlugs failed: ${error.message}`)
  return (data ?? []).map((row) => row.slug)
}

/** Aggregate counts for the home page, via one SECURITY DEFINER function. */
export async function getDirectoryStats() {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.rpc('directory_stats')
  if (error) throw new Error(`directory_stats failed: ${error.message}`)

  const row = data?.[0]
  return {
    listings: row?.listing_count ?? 0,
    cities: row?.city_count ?? 0,
    categories: row?.category_count ?? 0,
    reviews: row?.review_count ?? 0,
  }
}

/** Amenity facet options, with counts so empty options can be hidden. */
export async function getAmenityFacets(citySlug?: string) {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.rpc('facet_amenities', {
    ...(citySlug ? { p_city_slug: citySlug } : {}),
  })
  if (error) throw new Error(`facet_amenities failed: ${error.message}`)
  return data ?? []
}

/** Localities within a city that actually have published listings. */
export async function getLocalityFacets(citySlug: string, locale: Locale) {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.rpc('facet_localities', { p_city_slug: citySlug })
  if (error) throw new Error(`facet_localities failed: ${error.message}`)

  return (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    nameI18n: row.name_i18n,
    count: row.listing_count,
    locale,
  }))
}
