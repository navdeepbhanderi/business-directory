import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { publicEnv, serverEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Service-role client — BYPASSES RLS.
 *
 * The `server-only` import above makes it a build error to reach this module
 * from a Client Component, which is the guardrail that keeps the key out of the
 * browser bundle.
 *
 * Legitimate uses are narrow: Stripe webhooks, scheduled jobs, and admin
 * operations already gated by a checked `SECURITY DEFINER` function. If a
 * feature seems to need this, the usual answer is a missing RLS policy.
 */
export function createSupabaseAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv()
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv()

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
