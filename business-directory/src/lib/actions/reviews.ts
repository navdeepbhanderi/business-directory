'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from '@/lib/actions/auth'
import {
  REVIEW_MAX_PHOTOS,
  replySchema,
  reportSchema,
  reviewEditSchema,
  reviewSchema,
  voteSchema,
} from '@/lib/review-schemas'
import { toFieldErrors } from '@/lib/auth-schemas'

/**
 * Review actions.
 *
 * None of these check ownership or eligibility in application code. The database
 * already refuses a second review from the same person, a review of a listing you
 * own, an edit past 24 hours, a vote on your own review, and a sixth review in an
 * hour. So these translate a database refusal into a message rather than
 * duplicating the rule — which would give two rules that can disagree.
 */

/**
 * Maps a Postgres error onto a message code.
 *
 * Every one of these corresponds to a specific constraint, trigger, or policy in
 * the schema, so a refusal can be explained instead of becoming "failed".
 */
type DbError = { code?: string; message?: string } | null

/** Uniqueness surfaces as 23505, with the constraint name in the message. */
function isDuplicate(error: DbError): boolean {
  return Boolean(
    error && (error.code === '23505' || error.message?.includes('reviews_one_per_author')),
  )
}

function codeFor(error: DbError): string {
  if (!error) return 'failed'
  if (isDuplicate(error)) return 'duplicate'

  switch (error.code) {
    case '23514': // CHECK constraint — length or rating bounds
      return 'invalid'
    case '23503': // foreign key — the listing or review is gone
      return 'missing'
    case '54000': // raised by reviews_enforce_rate_limit
      return 'rate-limited'
    case '42501':
      // Both the self-review trigger and the RLS policies raise this, and a user
      // needs to know which applies, so the message decides.
      return error.message?.includes('own') ? 'own-business' : 'not-allowed'
    default:
      return 'failed'
  }
}

async function uploadReviewPhotos(
  files: File[],
  userId: string,
): Promise<{ paths: string[]; error?: string }> {
  if (files.length === 0) return { paths: [] }
  if (files.length > REVIEW_MAX_PHOTOS) return { paths: [], error: 'too-many' }

  const supabase = await createSupabaseServerClient()
  const paths: string[] = []

  for (const [index, file] of files.entries()) {
    if (file.size === 0) continue
    if (file.size > 5 * 1024 * 1024) return { paths, error: 'too-large' }

    const extension = file.type.split('/')[1] ?? 'jpg'
    // Path is uid-scoped; the storage policy requires the first segment to equal
    // the caller's uid, so a crafted name cannot escape the user's own folder.
    const path = `${userId}/${Date.now()}-${index}.${extension}`

    const { error } = await supabase.storage
      .from('review-photos')
      .upload(path, file, { contentType: file.type })
    if (error) return { paths, error: 'upload-failed' }

    const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
    paths.push(data.publicUrl)
  }

  return { paths }
}

export async function submitReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reviewSchema.safeParse({
    businessId: formData.get('businessId'),
    rating: formData.get('rating'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File)
  const uploads = await uploadReviewPhotos(files, auth.user.id)
  if (uploads.error) return { errors: { photos: uploads.error } }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      business_id: parsed.data.businessId,
      author_id: auth.user.id,
      rating: parsed.data.rating,
      body: parsed.data.body,
    })
    .select('id')
    .single()

  if (error) return { errors: { form: codeFor(error) } }

  if (uploads.paths.length > 0) {
    await supabase.from('review_photos').insert(
      uploads.paths.map((storage_path, sort_order) => ({
        review_id: review.id,
        storage_path,
        sort_order,
      })),
    )
  }

  // The rating trigger has already updated the listing, so the cached page is
  // stale in two ways: the review is missing and the average is wrong.
  revalidatePath('/', 'layout')
  return { ok: true, message: 'review-posted' }
}

export async function editReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reviewEditSchema.safeParse({
    reviewId: formData.get('reviewId'),
    rating: formData.get('rating'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()

  // The 24-hour window is enforced by the RLS policy, so an expired edit matches
  // zero rows rather than erroring — which has to be detected explicitly.
  const { data, error } = await supabase
    .from('reviews')
    .update({ rating: parsed.data.rating, body: parsed.data.body, edited_at: new Date().toISOString() })
    .eq('id', parsed.data.reviewId)
    .select('id')

  if (error) return { errors: { form: codeFor(error) } }
  if (!data || data.length === 0) return { errors: { form: 'edit-window-closed' } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'review-updated' }
}

export async function deleteReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reviewId = formData.get('reviewId')
  if (typeof reviewId !== 'string') return { errors: { form: 'invalid' } }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'review-deleted' }
}

/**
 * Toggles a helpful vote.
 *
 * Voting on your own review is refused by the insert policy, so no check here.
 */
export async function toggleVoteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voteSchema.safeParse({ reviewId: formData.get('reviewId') })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  const { data: existing } = await supabase
    .from('review_votes')
    .select('review_id')
    .eq('review_id', parsed.data.reviewId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('review_votes')
      .delete()
      .eq('review_id', parsed.data.reviewId)
      .eq('user_id', auth.user.id)
    if (error) return { errors: { form: codeFor(error) } }
  } else {
    const { error } = await supabase
      .from('review_votes')
      .insert({ review_id: parsed.data.reviewId, user_id: auth.user.id })
    if (error) return { errors: { form: codeFor(error) } }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function replyToReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = replySchema.safeParse({
    reviewId: formData.get('reviewId'),
    businessId: formData.get('businessId'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  // One reply per review is a unique constraint, so an upsert is the honest
  // expression of "post or amend my reply".
  const { error } = await supabase.from('review_replies').upsert(
    {
      review_id: parsed.data.reviewId,
      business_id: parsed.data.businessId,
      author_id: auth.user.id,
      body: parsed.data.body,
    },
    { onConflict: 'review_id' },
  )

  if (error) return { errors: { form: codeFor(error) } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'reply-posted' }
}

export async function reportReviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const detail = formData.get('detail')
  const parsed = reportSchema.safeParse({
    reviewId: formData.get('reviewId'),
    reason: formData.get('reason'),
    detail: typeof detail === 'string' && detail.trim() !== '' ? detail : undefined,
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'signed-out' } }

  const { error } = await supabase.from('review_reports').insert({
    review_id: parsed.data.reviewId,
    reporter_id: auth.user.id,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
  })

  if (error) {
    // One report per person per review. A second is not really an error, so it
    // reports as already-done rather than as a failure.
    return { errors: { form: isDuplicate(error) ? 'already-reported' : codeFor(error) } }
  }

  return { ok: true, message: 'report-received' }
}
