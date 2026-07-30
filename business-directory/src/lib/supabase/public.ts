import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Anonymous, cookie-free server client for **published data only**.
 *
 * Why this exists: the cookie-bound client in `server.ts` reads `cookies()`,
 * which opts the whole route out of static rendering. Every public page was
 * therefore rendering dynamically — including listing pages, where being
 * statically generated and cached is the entire SEO argument for the project.
 *
 * This client sends no session, so it is `anon` to Postgres and RLS restricts
 * it to exactly what an unauthenticated visitor may see. That is a feature
 * rather than a compromise: a page built with this client *cannot* leak an
 * unpublished listing, because the database will not return one.
 *
 * Use `server.ts` instead the moment a page depends on who is asking —
 * favourites, an owner's drafts, anything personalised.
 */
export function createSupabasePublicClient() {
  const env = publicEnv()

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-openly-client': 'public-ssg' } },
  })
}
