'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { notificationSchema, profileSchema, toFieldErrors } from '@/lib/auth-schemas'
import type { ActionState } from '@/lib/actions/auth'

/**
 * Account actions.
 *
 * None of these check "is this my row" in application code — every write is
 * scoped by `auth.uid()` in an RLS policy. If the `.eq('id', user.id)` below
 * were removed the query would still be unable to touch anyone else's profile.
 * That is the point of putting authorization in the database.
 */

function localeFrom(value: FormDataEntryValue | null): Locale {
  const raw = typeof value === 'string' ? value : ''
  return isLocale(raw) ? raw : defaultLocale
}

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    locale: formData.get('profileLocale'),
    phone: formData.get('phone') ?? '',
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'expired' } }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      locale: parsed.data.locale,
      phone: parsed.data.phone === '' ? null : (parsed.data.phone ?? null),
    })
    .eq('id', auth.user.id)

  // A role or ban attempt would be rejected by the guard trigger with 42501;
  // this path only ever sends the three columns above.
  if (error) return { errors: { form: 'failed' } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'saved' }
}

export async function updateNotificationsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = notificationSchema.safeParse({
    offers: formData.get('offers') === 'on',
    reviewsOnSaved: formData.get('reviewsOnSaved') === 'on',
    cityPromotions: formData.get('cityPromotions') === 'on',
    emailEnabled: formData.get('emailEnabled') === 'on',
    frequency: formData.get('frequency') ?? 'instant',
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'expired' } }

  const { error } = await supabase.from('notification_preferences').upsert({
    user_id: auth.user.id,
    offers: parsed.data.offers,
    reviews_on_saved: parsed.data.reviewsOnSaved,
    city_promotions: parsed.data.cityPromotions,
    email_enabled: parsed.data.emailEnabled,
    frequency: parsed.data.frequency,
  })

  if (error) return { errors: { form: 'failed' } }
  return { ok: true, message: 'saved' }
}

/**
 * Avatar upload.
 *
 * The object path is `<uid>/avatar-<timestamp>`, and the storage policy requires
 * the first path segment to equal the caller's uid — so a crafted filename
 * cannot write into someone else's folder. Type and size are checked here for a
 * useful error, and again by the bucket, which is what actually enforces them.
 */
export async function uploadAvatarAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) return { errors: { avatar: 'required' } }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (!allowed.includes(file.type)) return { errors: { avatar: 'invalid' } }
  if (file.size > 2 * 1024 * 1024) return { errors: { avatar: 'too-long' } }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'expired' } }

  const extension = file.type.split('/')[1] ?? 'jpg'
  const path = `${auth.user.id}/avatar-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return { errors: { avatar: 'failed' } }

  const { data: published } = supabase.storage.from('avatars').getPublicUrl(path)

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: published.publicUrl })
    .eq('id', auth.user.id)
  if (error) return { errors: { form: 'failed' } }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'saved' }
}

export async function deleteAccountAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData.get('locale'))

  // Typing the word is the confirmation. A single click is too little friction
  // for an irreversible action.
  if (formData.get('confirm') !== 'DELETE') return { errors: { confirm: 'invalid' } }

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'expired' } }

  const { error } = await supabase.rpc('delete_own_account')
  if (error) return { errors: { form: 'failed' } }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(`/${locale}?deleted=1`)
}
