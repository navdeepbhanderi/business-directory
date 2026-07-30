import { NextResponse, type NextRequest } from 'next/server'
import { isLocale } from '@/i18n/config'
import { negotiateLocale } from '@/i18n/negotiate'

const LOCALE_COOKIE = 'locale'

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const firstSegment = pathname.split('/')[1]
  if (firstSegment && isLocale(firstSegment)) {
    // Already locale-prefixed. Phase 5 adds Supabase session refresh here.
    return NextResponse.next()
  }

  const locale = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language') ?? undefined,
  })

  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`

  const response = NextResponse.redirect(url)
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  // Everything except Next internals, API routes, and files with an extension.
  matcher: ['/((?!_next/static|_next/image|api/|.*\\.).*)'],
}
