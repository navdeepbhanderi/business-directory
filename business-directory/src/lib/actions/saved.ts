'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'
import { toFieldErrors } from '@/lib/auth-schemas'
import {
  favoriteSchema,
  listCreateSchema,
  listItemSchema,
  listUpdateSchema,
  reorderSchema,
  savedSearchSchema,
} from '@/lib/saved-schemas'

/**
 * Favourites, lists, and saved searches.
 *
 * As with reviews, no ownership check lives here. `favorites_own_all`,
 * `lists_write_own`, `list_items_write_own`, and `saved_searches_own_all` already
 * restrict every one of these to the caller's own rows, and an update that
 * addresses someone else's row simply matches nothing. Repeating the rule in
 * application code would give two rules that can disagree.
 */

type DbError = { code?: string; message?: string } | null

function codeFor(error: DbError): string {
  if (!error) return 'failed'

  switch (error.code) {
    case '23505':
      return 'duplicate'
    case '23514': // CHECK constraint — a name or note past its limit
      return 'invalid'
    case '23503': // foreign key — the listing or list is gone
      return 'missing'
    case '42501':
      return 'not-allowed'
    default:
      return 'failed'
  }
}

/**
 * Toggle a favourite.
 *
 * Returns which way it went, so the caller can reconcile its optimistic state
 * against what actually happened rather than assuming.
 */
export async function toggleFavoriteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = favoriteSchema.safeParse({ businessId: formData.get('businessId') })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  const { data: existing } = await supabase
    .from('favorites')
    .select('business_id')
    .eq('business_id', parsed.data.businessId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('business_id', parsed.data.businessId)
      .eq('user_id', auth.user.id)
    if (error) return { errors: { form: codeFor(error) } }
    return { ok: true, message: 'removed' }
  }

  const { error } = await supabase
    .from('favorites')
    .insert({ business_id: parsed.data.businessId, user_id: auth.user.id })
  if (error) return { errors: { form: codeFor(error) } }
  return { ok: true, message: 'added' }
}

export async function createListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const description = formData.get('description')
  const parsed = listCreateSchema.safeParse({
    name: formData.get('name'),
    description: typeof description === 'string' && description.trim() !== '' ? description : undefined,
    visibility: formData.get('visibility') ?? undefined,
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  const { data, error } = await supabase
    .from('lists')
    .insert({
      owner_id: auth.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      visibility: parsed.data.visibility,
    })
    .select('id')
    .single()

  if (error) return { errors: { form: codeFor(error) } }

  // A list is created in order to put something in it, so the id goes back to the
  // caller: the add-to-list menu adds the listing without a second round trip.
  revalidatePath('/', 'layout')
  return { ok: true, message: data.id }
}

export async function updateListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const description = formData.get('description')
  const parsed = listUpdateSchema.safeParse({
    listId: formData.get('listId'),
    name: formData.get('name'),
    description: typeof description === 'string' && description.trim() !== '' ? description : undefined,
    visibility: formData.get('visibility'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()

  /*
   * `share_slug` is not written here. The trigger owns it: it mints one when a
   * list becomes shared and destroys it when the list goes private, so a link
   * that has been passed around stops working the moment someone means it to.
   */
  const { data, error } = await supabase
    .from('lists')
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      visibility: parsed.data.visibility,
    })
    .eq('id', parsed.data.listId)
    .select('id, visibility, share_slug')

  if (error) return { errors: { form: codeFor(error) } }
  if (!data || data.length === 0) return { errors: { form: 'missing' } }

  revalidatePath('/', 'layout')
  return { ok: true, message: data[0]?.share_slug ?? 'updated' }
}

export async function deleteListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const listId = formData.get('listId')
  if (typeof listId !== 'string') return { errors: { form: 'invalid' } }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('lists').delete().eq('id', listId)
  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'deleted' }
}

export async function addToListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const note = formData.get('note')
  const parsed = listItemSchema.safeParse({
    listId: formData.get('listId'),
    businessId: formData.get('businessId'),
    note: typeof note === 'string' && note.trim() !== '' ? note : undefined,
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()

  // Adding something already in the list is not an error — it is a no-op with a
  // note update, which is what someone editing a note is doing.
  const { error } = await supabase.from('list_items').upsert(
    {
      list_id: parsed.data.listId,
      business_id: parsed.data.businessId,
      note: parsed.data.note ?? null,
    },
    { onConflict: 'list_id,business_id' },
  )

  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'added' }
}

export async function removeFromListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const listId = formData.get('listId')
  const businessId = formData.get('businessId')
  if (typeof listId !== 'string' || typeof businessId !== 'string') {
    return { errors: { form: 'invalid' } }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('business_id', businessId)
  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'removed' }
}

/**
 * Reorder a list in one statement.
 *
 * The alternative — one update per item — can leave a list half-reordered if the
 * page is closed midway, and it costs a round trip per row.
 */
export async function reorderListAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formData.get('businessIds')
  const parsed = reorderSchema.safeParse({
    listId: formData.get('listId'),
    businessIds: typeof raw === 'string' ? raw.split(',').filter(Boolean) : [],
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('reorder_list_items', {
    p_list_id: parsed.data.listId,
    p_business_ids: parsed.data.businessIds,
  })
  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'reordered' }
}

export async function saveSearchAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = savedSearchSchema.safeParse({
    name: formData.get('name'),
    query: formData.get('query') ?? '',
    notify: formData.get('notify') === 'on',
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  const { error } = await supabase.from('saved_searches').insert({
    user_id: auth.user.id,
    name: parsed.data.name,
    // Stored as the parsed pairs rather than a raw string, so a saved search can
    // be re-run, inspected, and later matched against new listings for the
    // notification work in Phase 11.
    params: Object.fromEntries(new URLSearchParams(parsed.data.query)),
    notify: parsed.data.notify,
  })
  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'saved' }
}

export async function deleteSavedSearchAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get('searchId')
  if (typeof id !== 'string') return { errors: { form: 'invalid' } }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('saved_searches').delete().eq('id', id)
  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'deleted' }
}
