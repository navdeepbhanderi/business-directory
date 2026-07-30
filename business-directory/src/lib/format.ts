import { getMarket, localeMeta, type Locale, type MarketCode } from '@/i18n/config'
import { toMinutes, type Weekday } from '@/lib/hours'

/**
 * All user-facing number, date, and time formatting goes through here.
 *
 * Everything is `Intl`-driven off the locale's BCP 47 tag, so Hindi gets its own
 * numbering and date conventions without a second code path. India also groups
 * digits differently (1,20,000 rather than 120,000) — `en-IN` handles that, and
 * hardcoding `toLocaleString()` with no locale would not.
 */

function tagFor(locale: Locale): string {
  return localeMeta[locale].tag
}

export function formatCurrency(amount: number, locale: Locale, market: MarketCode = 'IN'): string {
  const { currency } = getMarket(market)
  return new Intl.NumberFormat(tagFor(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function formatPriceRange(
  min: number | null,
  max: number | null,
  locale: Locale,
  market: MarketCode = 'IN',
): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null && min !== max) {
    return `${formatCurrency(min, locale, market)} – ${formatCurrency(max, locale, market)}`
  }
  const single = min ?? max
  return single === null ? null : formatCurrency(single, locale, market)
}

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tagFor(locale)).format(value)
}

/** One decimal place always, so "4.0" does not render as "4" beside "4.5". */
export function formatRating(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tagFor(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Distances round coarsely on purpose. "1.2 km" is useful; "1.238 km" is noise
 * that also implies a precision the geocoding does not have.
 */
export function formatDistance(km: number | null, locale: Locale): string | null {
  if (km === null || !Number.isFinite(km)) return null
  const tag = tagFor(locale)
  if (km < 1) {
    const metres = Math.round((km * 1000) / 10) * 10
    return `${new Intl.NumberFormat(tag).format(metres)} m`
  }
  return `${new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(km)} km`
}

/** "09:00" → "9:00 am". Falls back to the raw value if it cannot be parsed. */
export function formatTime(time: string, locale: Locale, market: MarketCode = 'IN'): string {
  const minutes = toMinutes(time)
  if (minutes === null) return time

  const { timeZone } = getMarket(market)
  // A fixed UTC date carrying the wall-clock time; only the time is formatted.
  const reference = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))

  return new Intl.DateTimeFormat(tagFor(locale), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: timeZone === 'Asia/Kolkata',
  }).format(reference)
}

export function weekdayName(
  day: Weekday,
  locale: Locale,
  width: 'long' | 'short' = 'short',
): string {
  // 4 Jan 1970 was a Sunday, so adding `day` lands on the right weekday.
  const reference = new Date(Date.UTC(1970, 0, 4 + day))
  return new Intl.DateTimeFormat(tagFor(locale), { weekday: width, timeZone: 'UTC' }).format(
    reference,
  )
}

export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(tagFor(locale), { dateStyle: 'medium' }).format(date)
}

/** "3 months ago". Used on reviews, where exact dates add nothing. */
export function formatRelative(value: string | Date, locale: Locale, now = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = (date.getTime() - now.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(tagFor(locale), { numeric: 'auto' })

  const thresholds: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  for (const [unit, size] of thresholds) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
  return rtf.format(0, 'minute')
}

/** Price level 1–4 rendered as the local currency symbol repeated. */
export function priceLevelSymbol(level: number, market: MarketCode = 'IN'): string {
  const { currency } = getMarket(market)
  const symbol =
    new Intl.NumberFormat('en', { style: 'currency', currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? '₹'
  return symbol.repeat(Math.min(Math.max(level, 1), 4))
}
