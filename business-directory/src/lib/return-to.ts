import type { Locale } from '@/i18n/config'

/**
 * Resolves where to send someone after authenticating.
 *
 * Guards against an open redirect: `?next=https://evil.example` would otherwise
 * hand a freshly authenticated user to another origin, and `//evil.example` is
 * the same attack in protocol-relative clothing. Only same-origin absolute paths
 * are honoured; anything else falls back to the locale home.
 *
 * Pure and in its own module so it can be unit tested — a security guard that is
 * only exercised through a browser is a security guard nobody checks.
 */
export function safeReturnTo(next: string | null | undefined, locale: Locale): string {
  if (!next) return `/${locale}`
  if (!next.startsWith('/')) return `/${locale}`
  // `//host` and `/\host` are both treated as protocol-relative by browsers.
  if (next.startsWith('//') || next.startsWith('/\\')) return `/${locale}`
  return next
}
