'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { safeReturnTo } from '@/lib/auth'
import {
  forgotPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
  type FieldErrors,
} from '@/lib/auth-schemas'

/**
 * Auth Server Actions.
 *
 * Every one validates with zod before touching Supabase, and every one returns a
 * field-keyed error object rather than throwing — a thrown error in a form action
 * loses whatever the user typed.
 *
 * Error messages are deliberately coarse. "Email or password is incorrect" for
 * both a missing account and a wrong password: distinguishing them turns the
 * sign-in form into an account-existence oracle.
 */

export type ActionState = {
  errors?: FieldErrors
  message?: string
  ok?: boolean
}

function localeFrom(value: FormDataEntryValue | null): Locale {
  const raw = typeof value === 'string' ? value : ''
  return isLocale(raw) ? raw : defaultLocale
}

/**
 * Reads a form field as a string, or undefined.
 *
 * A `FormData` entry can be a `File`, and `File.toString()` yields
 * "[object File]" — which would then be handed to the redirect logic. It would
 * be rejected there, but code should not depend on a downstream guard to cover
 * a type it never checked.
 */
function textField(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Absolute origin, needed for the email redirect links Supabase sends. */
async function origin(): Promise<string> {
  const list = await headers()
  const host = list.get('x-forwarded-host') ?? list.get('host') ?? 'localhost:3000'
  const protocol =
    list.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

export async function signUpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData.get('locale'))

  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    locale,
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user trigger to seed the profile row.
      data: { full_name: parsed.data.fullName, locale: parsed.data.locale },
      emailRedirectTo: `${await origin()}/${locale}/auth/callback`,
    },
  })

  if (error) {
    // Supabase reports an existing address here. Saying so is a deliberate
    // trade: signup is the one flow where silence produces a worse outcome —
    // someone stuck unable to proceed and unable to see why.
    return { errors: { form: error.code === 'user_already_exists' ? 'exists' : 'failed' } }
  }

  redirect(`/${locale}/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}

export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData.get('locale'))
  const next = safeReturnTo(textField(formData.get('next')), locale)

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // One message for every failure mode, so the form cannot be used to
    // enumerate which addresses have accounts.
    return { errors: { form: 'invalid-credentials' } }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData.get('locale'))
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(`/${locale}`)
}

export async function forgotPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData.get('locale'))
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/${locale}/auth/callback?type=recovery`,
  })

  // Always reports success, whether or not the address exists. Anything else
  // makes this endpoint an account-existence check.
  return { ok: true, message: 'sent' }
}

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData.get('locale'))
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()

  // Only valid inside a recovery session, which the callback established.
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { errors: { form: 'expired' } }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { errors: { form: 'failed' } }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/account?updated=password`)
}

export async function requestOtpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = otpRequestSchema.safeParse({ phone: formData.get('phone') })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone })

  if (error) {
    // Reported plainly: without an SMS provider configured this fails, and a
    // silent no-op would look like a lost message.
    return { errors: { form: 'otp-unavailable' } }
  }
  return { ok: true, message: 'otp-sent' }
}

export async function verifyOtpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locale = localeFrom(formData.get('locale'))
  const next = safeReturnTo(textField(formData.get('next')), locale)

  const parsed = otpVerifySchema.safeParse({
    phone: formData.get('phone'),
    token: formData.get('token'),
  })
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: 'sms',
  })

  if (error) return { errors: { token: 'invalid' } }

  revalidatePath('/', 'layout')
  redirect(next)
}
