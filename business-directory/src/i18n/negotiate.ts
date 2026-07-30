import { defaultLocale, isLocale, type Locale } from './config'

/**
 * Parses an Accept-Language header into language tags ordered by descending
 * q-value. Malformed q-values are treated as the lowest possible preference
 * rather than throwing — a bad header should degrade, not 500.
 */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const parsed = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '') : 1
      return {
        tag: tag.trim().toLowerCase(),
        q: Number.isFinite(parsed) ? parsed : 0,
      }
    })
    .filter((entry) => entry.tag.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)
}

/**
 * Resolves the locale to serve. An explicit user choice (cookie) always wins
 * over browser configuration; `en` is the final fallback.
 */
export function negotiateLocale({
  cookie,
  acceptLanguage,
}: {
  cookie?: string | undefined
  acceptLanguage?: string | undefined
}): Locale {
  if (cookie && isLocale(cookie)) return cookie

  if (acceptLanguage) {
    for (const tag of parseAcceptLanguage(acceptLanguage)) {
      // Match the base subtag, so `ar-BH` and `ar-EG` both resolve to `ar`.
      const base = tag.split('-')[0]
      if (base && isLocale(base)) return base
    }
  }

  return defaultLocale
}
