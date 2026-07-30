import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase session during the proxy pass.
 *
 * This has to happen here and nowhere else. Access tokens expire hourly, and
 * Server Components cannot set cookies — so if the refresh is attempted during
 * render, the new token is computed and then thrown away, and the user is
 * silently signed out an hour after signing in.
 *
 * `getUser()` rather than `getSession()`: `getSession` reads the cookie and
 * trusts it, while `getUser` validates the token against the auth server. For an
 * authorization decision the difference matters — a forged cookie satisfies the
 * first and not the second.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const env = publicEnv()

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            // Written to both: the request so any later read in this pass sees
            // the fresh token, and the response so the browser keeps it.
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const { data, error } = await supabase.auth.getUser()
  return { user: error ? null : data.user }
}
