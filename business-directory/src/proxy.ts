import { NextResponse, type NextRequest } from 'next/server'
import { isLocale } from '@/i18n/config'
import { negotiateLocale } from '@/i18n/negotiate'
import { refreshSession } from '@/lib/supabase/proxy-session'

const LOCALE_COOKIE = 'locale'

/**
 * Route sections that require a session, and the roles allowed through.
 *
 * This is a coarse first gate. It exists so an unauthenticated visitor gets a
 * sign-in redirect rather than a flash of an empty page — the real boundary is
 * RLS in the database, plus a `requireRole` check inside each page. Three
 * independent layers, and the innermost one cannot be bypassed from a client.
 */
const PROTECTED: { prefix: string; roles: readonly string[] }[] = [
  { prefix: 'account', roles: ['user', 'owner', 'admin'] },
  { prefix: 'owner', roles: ['owner', 'admin'] },
  { prefix: 'admin', roles: ['admin'] },
]

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const maybeLocale = segments[1]

  // ---- Locale ------------------------------------------------------------
  if (!maybeLocale || !isLocale(maybeLocale)) {
    const locale = negotiateLocale({
      cookie: request.cookies.get(LOCALE_COOKIE)?.value,
      acceptLanguage: request.headers.get('accept-language') ?? undefined,
    })

    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`

    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return redirectResponse
  }

  const locale = maybeLocale
  const response = NextResponse.next({ request })

  // ---- Session -----------------------------------------------------------
  // Runs on every locale-prefixed request, not only protected ones: the access
  // token has to be refreshed while a response is still writable, and a Server
  // Component cannot set cookies. Skipping it here signs people out hourly.
  const { user } = await refreshSession(request, response)

  // ---- Guards ------------------------------------------------------------
  const section = segments[2]
  const rule = PROTECTED.find((entry) => entry.prefix === section)

  if (rule) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/auth/sign-in`
      url.search = `?next=${encodeURIComponent(pathname)}`
      return NextResponse.redirect(url)
    }

    // The role travels in the JWT via the access-token hook, so this costs no
    // database round trip. When the claim is absent the request is allowed
    // through and the page's own `requireRole` decides — failing open here
    // would be wrong, but this gate is not the boundary, and failing closed on a
    // missing claim would lock out anyone whose token predates the hook.
    const appMetadata = user.app_metadata as { user_role?: string } | undefined
    const claimedRole = appMetadata?.user_role

    if (claimedRole && !rule.roles.includes(claimedRole)) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}`
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // A signed-in user has no business on the sign-in or sign-up page.
  if (user && section === 'auth' && ['sign-in', 'sign-up'].includes(segments[3] ?? '')) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/account`
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Everything except Next internals, API routes, files with an extension, and
  // routes that are deliberately not locale-scoped (the internal style guide).
  matcher: ['/((?!_next/static|_next/image|api/|design|.*\\.).*)'],
}
