import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * What the viewer has saved: favourites, and their lists with contents.
 *
 * Exists for the same reason as /api/review-context. Favourite state is
 * viewer-specific and appears on every card in the product, including cards on
 * statically generated pages — the home page and 200 listing pages. Reading the
 * session while rendering any of them would opt the whole route out of static
 * rendering, which is the SEO argument for the project.
 *
 * One request per page, shared by every card on it. That is also what makes the
 * buttons agree with each other: three favourite buttons for the same listing
 * read the same client-side state, so there is nothing to keep in sync.
 *
 * Not a security boundary. `favorites_own_all` and `list_items_write_own` decide
 * what may actually be written; a tampered response changes which button looks
 * pressed and nothing else. Lists are returned with their business ids because a
 * person has tens of them, not thousands — if that stops being true this becomes
 * a per-listing query.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()

  const headers = { 'cache-control': 'private, no-store' }

  if (!auth.user) {
    return NextResponse.json({ signedIn: false, favorites: [], lists: [] }, { headers })
  }

  const [favorites, lists] = await Promise.all([
    supabase.from('favorites').select('business_id').eq('user_id', auth.user.id),
    supabase
      .from('lists')
      .select('id, name, visibility, share_slug, list_items ( business_id )')
      .eq('owner_id', auth.user.id)
      .order('updated_at', { ascending: false }),
  ])

  return NextResponse.json(
    {
      signedIn: true,
      favorites: (favorites.data ?? []).map((row) => row.business_id),
      lists: (lists.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        visibility: row.visibility,
        shareSlug: row.share_slug,
        businessIds: (row.list_items ?? []).map((item) => item.business_id),
      })),
    },
    { headers },
  )
}
