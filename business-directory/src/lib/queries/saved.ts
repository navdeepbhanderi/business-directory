import 'server-only'

import { createSupabasePublicClient } from '@/lib/supabase/public'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Reads for saved content.
 *
 * Split by who is asking, which decides which client is used:
 *
 *  - The account pages are signed-in only and dynamic anyway, so they use the
 *    cookie-bound client and let RLS scope every row to the caller.
 *  - A shared list is read with the anon client through a slug-scoped function.
 *    Nothing about it depends on who is looking, so the page can be cached, and a
 *    stranger holding the link gets exactly what the owner shared and nothing
 *    adjacent to it.
 */

export async function getFavorites(limit = 60, offset = 0) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('favorite_businesses', {
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw new Error(`favorite_businesses failed: ${error.message}`)

  const rows = data ?? []
  return { items: rows, total: Number(rows[0]?.total_count ?? 0) }
}

export async function getLists() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, description, visibility, share_slug, updated_at, list_items ( business_id )')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`getLists failed: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    shareSlug: row.share_slug,
    updatedAt: row.updated_at,
    itemCount: (row.list_items ?? []).length,
  }))
}

export async function getList(listId: string) {
  const supabase = await createSupabaseServerClient()

  const [list, items] = await Promise.all([
    supabase
      .from('lists')
      .select('id, name, description, visibility, share_slug, updated_at')
      .eq('id', listId)
      .maybeSingle(),
    supabase.rpc('list_businesses', { p_list_id: listId }),
  ])

  if (list.error) throw new Error(`getList failed: ${list.error.message}`)
  if (items.error) throw new Error(`list_businesses failed: ${items.error.message}`)
  // A list belonging to someone else is simply not visible, so this is a 404
  // rather than a 403 — the caller cannot tell whether it exists.
  if (!list.data) return null

  return { list: list.data, items: items.data ?? [] }
}

export async function getSavedSearches() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('saved_searches')
    .select('id, name, params, notify, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getSavedSearches failed: ${error.message}`)
  return data ?? []
}

export async function getSharedList(slug: string) {
  const supabase = createSupabasePublicClient()

  const [list, items] = await Promise.all([
    supabase.rpc('shared_list', { p_slug: slug }),
    supabase.rpc('shared_list_items', { p_slug: slug }),
  ])

  if (list.error) throw new Error(`shared_list failed: ${list.error.message}`)
  if (items.error) throw new Error(`shared_list_items failed: ${items.error.message}`)

  const row = list.data?.[0]
  if (!row) return null

  return { list: row, items: items.data ?? [] }
}
