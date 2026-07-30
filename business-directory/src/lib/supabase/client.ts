'use client'

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Browser client. Reserved for genuinely interactive surfaces — the map,
 * optimistic favourite toggles, and the realtime moderation queue. Everything
 * else reads on the server.
 */
export function createSupabaseBrowserClient() {
  const env = publicEnv()

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
