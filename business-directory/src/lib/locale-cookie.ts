import type { Locale } from '@/i18n/config'

const LOCALE_COOKIE = 'locale'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Persists an explicit language choice for `proxy.ts` to read on a later visit
 * to the bare root.
 *
 * Lives outside the component because writing `document.cookie` inline trips
 * the React Compiler's immutability rule — and a named side effect in its own
 * module reads better than a suppression comment anyway.
 */
export function setLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}
