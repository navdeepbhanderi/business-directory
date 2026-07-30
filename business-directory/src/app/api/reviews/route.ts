import { NextResponse, type NextRequest } from 'next/server'
import { getPublishedReviews } from '@/lib/queries/businesses'
import { parseReviewSort } from '@/lib/review-schemas'

/**
 * Published reviews, for re-sorting and paging in the browser.
 *
 * Read with the anon key and no cookies, so the response is identical for every
 * caller and can be cached. Keeping sort and paging here rather than in the
 * page's search params is what lets the listing page stay statically generated:
 * the first page of reviews is prerendered into the HTML, and this serves
 * everything after the visitor touches a control.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const businessId = params.get('businessId')
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const offset = Number.parseInt(params.get('offset') ?? '0', 10)
  const limit = Number.parseInt(params.get('limit') ?? '10', 10)

  const { items, total } = await getPublishedReviews(businessId, {
    sort: parseReviewSort(params.get('sort') ?? undefined),
    // Bounds are clamped in SQL too; doing it here as well keeps a silly query
    // from reaching the database at all.
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  })

  return NextResponse.json(
    { items, total },
    { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=300' } },
  )
}
