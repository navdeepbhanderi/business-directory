/**
 * Locale registry.
 *
 * India is the launch market, but nothing here is India-specific: adding a
 * locale is a single entry plus a dictionary file, and adding a market is a
 * single entry in `markets`. That keeps global expansion a data change rather
 * than a refactor.
 *
 * RTL is first-class from day one — not for a future market, but because Urdu
 * is one of India's scheduled languages. The infrastructure (logical CSS
 * properties, `dir` on <html>, direction-aware icons) is built now; RTL locales
 * ship in Phase 10 with native review, per the plan's rule that half-good
 * translation reads worse than none.
 */

export const locales = ['en', 'hi'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

/** Locales planned but not yet shipped. Listed so the RTL path stays honest. */
export const plannedLocales = ['ur', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml'] as const

export type LocaleMeta = {
  /** BCP 47 tag used for `lang`, `hreflang`, and `Intl` formatting. */
  tag: string
  direction: 'ltr' | 'rtl'
  /** Endonym — a language is always named in its own language. */
  label: string
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: { tag: 'en-IN', direction: 'ltr', label: 'English' },
  hi: { tag: 'hi-IN', direction: 'ltr', label: 'हिन्दी' },
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeMeta[locale].direction
}

/* ==========================================================================
   Markets
   ========================================================================== */

export type MarketCode = 'IN'

export type Market = {
  code: MarketCode
  name: string
  /** IANA zone. Open-now correctness depends on this, never on the server clock. */
  timeZone: string
  currency: string
  /** E.164 country calling code, without the leading '+'. */
  dialCode: string
  /** Locales offered in this market, most prominent first. */
  locales: readonly Locale[]
  /** Bounding box [west, south, east, north] — seeds map viewports. */
  bounds: readonly [number, number, number, number]
}

export const markets: Record<MarketCode, Market> = {
  IN: {
    code: 'IN',
    name: 'India',
    timeZone: 'Asia/Kolkata',
    currency: 'INR',
    dialCode: '91',
    locales: ['en', 'hi'],
    bounds: [68.1, 6.5, 97.4, 35.7],
  },
}

export const defaultMarket: MarketCode = 'IN'

export function getMarket(code: MarketCode = defaultMarket): Market {
  return markets[code]
}
