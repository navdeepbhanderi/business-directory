import 'server-only'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { Locale } from '@/i18n/config'

export type UserRole = Database['public']['Enums']['user_role']

export type SessionUser = {
  id: string
  email: string | null
  role: UserRole
  fullName: string | null
  avatarUrl: string | null
  bannedAt: string | null
}

/**
 * The current user, or null.
 *
 * Uses `getUser()`, which validates the token with the auth server, rather than
 * `getSession()`, which merely decodes the cookie. Everything downstream treats
 * this as an authorization fact, so it has to be verified rather than decoded.
 *
 * The profile row is fetched under the caller's own RLS context — no service
 * role anywhere in the read path.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient()

  const { data: auth, error } = await supabase.auth.getUser()
  if (error || !auth.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url, banned_at')
    .eq('id', auth.user.id)
    .maybeSingle()

  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    // A signed-in user with no profile row yet (the trigger runs on insert, but
    // be defensive) is treated as the lowest privilege, never elevated.
    role: profile?.role ?? 'user',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    bannedAt: profile?.banned_at ?? null,
  }
}

/**
 * Requires a signed-in, non-banned user.
 *
 * Redirects rather than throwing, and carries the attempted path in `next` so
 * signing in returns the visitor where they were going instead of dumping them
 * on the home page.
 */
export async function requireUser(locale: Locale, returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    redirect(`/${locale}/auth/sign-in?next=${encodeURIComponent(returnTo)}`)
  }
  if (user.bannedAt) {
    redirect(`/${locale}/auth/suspended`)
  }
  return user
}

/**
 * Requires one of the given roles.
 *
 * This is defence in depth, not the security boundary — RLS is. If this check
 * were deleted, an ordinary user reaching an admin page would still see nothing,
 * because every query behind it is filtered by policy. The check exists so they
 * get an honest redirect instead of an empty screen.
 */
export async function requireRole(
  locale: Locale,
  returnTo: string,
  roles: UserRole[],
): Promise<SessionUser> {
  const user = await requireUser(locale, returnTo)
  if (!roles.includes(user.role)) {
    redirect(`/${locale}`)
  }
  return user
}

export { safeReturnTo } from '@/lib/return-to'
