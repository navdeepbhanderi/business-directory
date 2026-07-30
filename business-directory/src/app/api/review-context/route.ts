import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Viewer-specific review context for one listing.
 *
 * This endpoint exists to keep listing pages statically generated. Reading the
 * session during the page render opts the whole route out of static rendering —
 * which is what silently turned 200 prerendered pages dynamic in Phase 5 and
 * again when the review section was first wired in.
 *
 * So the page server-renders the review *content* (public, cacheable, in the
 * JSON-LD), and the handful of answers that depend on who is asking are fetched
 * from here after mount:
 *
 *   - may this viewer post a review, and if not why
 *   - do they already have one, and is it still editable
 *   - do they own the listing (so the reply control appears)
 *   - which reviews have they voted on
 *
 * None of this is a security boundary. Every action behind it is enforced by RLS
 * and by triggers, so a forged response here changes what the UI offers, not what
 * the database permits.
 */
export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) {
    return NextResponse.json(
      { signedIn: false, canReview: false, reason: 'signed-out', ownsBusiness: false, votes: [] },
      // Never cached: the answer is per-viewer by definition.
      { headers: { 'cache-control': 'private, no-store' } },
    )
  }

  const [eligibility, business, own, votes] = await Promise.all([
    supabase.rpc('review_eligibility', { p_business_id: businessId }),
    supabase.from('businesses').select('owner_id').eq('id', businessId).maybeSingle(),
    supabase
      .from('reviews')
      .select('id, rating, body, created_at')
      .eq('business_id', businessId)
      .eq('author_id', auth.user.id)
      .maybeSingle(),
    supabase.from('review_votes').select('review_id').eq('user_id', auth.user.id),
  ])

  const row = eligibility.data?.[0]

  return NextResponse.json(
    {
      signedIn: true,
      canReview: row?.can_review ?? false,
      reason: row?.reason ?? null,
      ownsBusiness: business.data?.owner_id === auth.user.id,
      ownReview: own.data
        ? {
            id: own.data.id,
            rating: own.data.rating,
            body: own.data.body,
            createdAt: own.data.created_at,
          }
        : null,
      votes: (votes.data ?? []).map((vote) => vote.review_id),
    },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
