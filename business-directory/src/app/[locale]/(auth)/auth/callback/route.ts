import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import { defaultLocale, isLocale } from '@/i18n/config'
import { safeReturnTo } from '@/lib/auth'
import type { Database } from '@/types/database'

/**
 * Exchanges an auth code for a session.
 *
 * Handles every flow that arrives by link: email confirmation, password
 * recovery, and OAuth. A Route Handler rather than a page because the exchange
 * must set cookies, and only a handler or the proxy can.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')
  const next = safeReturnTo(url.searchParams.get('next'), locale)

  // Supabase reports link failures — expired, already used — as query params
  // rather than an error status.
  const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (authError) {
    return NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=link`, url.origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=missing-code`, url.origin))
  }

  const response = NextResponse.redirect(
    new URL(type === 'recovery' ? `/${locale}/auth/reset-password` : next, url.origin),
  )

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
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=exchange`, url.origin))
  }

  return response
}
