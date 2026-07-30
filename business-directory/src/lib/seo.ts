import { getMarket, localeMeta, locales, type Locale } from '@/i18n/config'
import { siteUrl } from '@/lib/env'

/**
 * JSON-LD builders.
 *
 * Pure functions returning plain objects, so the structured data is unit-tested
 * rather than eyeballed in a validator once and then quietly broken. Rich
 * results are the highest-visibility SEO win available to a directory — star
 * ratings in the search listing — and they fail silently when a required field
 * goes missing.
 *
 * Schema reference: https://schema.org/LocalBusiness
 */

export type JsonLd = Record<string, unknown>

/** Absolute URL. Schema.org `@id` and `url` must not be relative. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString()
}

export function localePath(locale: Locale, path = ''): string {
  return `/${locale}${path}`
}

/** `hreflang` map for every shipped locale, plus `x-default`. */
export function alternateLanguages(path: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const locale of locales) {
    map[localeMeta[locale].tag] = absoluteUrl(localePath(locale, path))
  }
  map['x-default'] = absoluteUrl(localePath('en', path))
  return map
}

export type BusinessSeoInput = {
  slug: string
  name: string
  description: string | null
  addressLine1: string
  addressLine2?: string | null
  postalCode?: string | null
  cityName: string
  localityName?: string | null
  state?: string | null
  countryCode: string
  latitude: number | null
  longitude: number | null
  phone?: string | null
  email?: string | null
  website?: string | null
  priceLevel: number | null
  rating: number
  reviewCount: number
  photoUrls: string[]
  /** Weekly hours, already resolved to the market's local time. */
  hours: { dayOfWeek: number; opens: string; closes: string }[]
  categories: string[]
}

const SCHEMA_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/**
 * `openingHoursSpecification`, one entry per contiguous run of identical days.
 *
 * Emitting seven near-identical entries is valid but noisy; grouping is what a
 * human-written schema would look like and keeps the payload small.
 */
export function openingHoursSpecification(hours: BusinessSeoInput['hours']): JsonLd[] {
  const byShape = new Map<string, { days: number[]; opens: string; closes: string }>()

  for (const slot of hours) {
    const key = `${slot.opens}-${slot.closes}`
    const existing = byShape.get(key)
    if (existing) {
      if (!existing.days.includes(slot.dayOfWeek)) existing.days.push(slot.dayOfWeek)
    } else {
      byShape.set(key, { days: [slot.dayOfWeek], opens: slot.opens, closes: slot.closes })
    }
  }

  return [...byShape.values()]
    .sort((a, b) => Math.min(...a.days) - Math.min(...b.days))
    .map((entry) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [...entry.days]
        .sort((a, b) => a - b)
        .map((day) => `https://schema.org/${SCHEMA_DAYS[day] ?? 'Monday'}`),
      opens: entry.opens,
      closes: entry.closes,
    }))
}

/**
 * `LocalBusiness` with `AggregateRating`.
 *
 * `aggregateRating` is omitted entirely when there are no reviews. Google
 * rejects an aggregate rating with a zero `reviewCount`, and a rejected block
 * can invalidate the whole graph — so a listing with no reviews must not claim
 * one rather than claiming zero.
 */
export function businessJsonLd(business: BusinessSeoInput, locale: Locale): JsonLd {
  const url = absoluteUrl(localePath(locale, `/business/${business.slug}`))
  const market = getMarket()

  const node: JsonLd = {
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name: business.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [business.addressLine1, business.addressLine2].filter(Boolean).join(', '),
      addressLocality: business.localityName ?? business.cityName,
      addressRegion: business.state ?? business.cityName,
      postalCode: business.postalCode ?? undefined,
      addressCountry: business.countryCode,
    },
  }

  if (business.description) node['description'] = business.description
  if (business.phone) node['telephone'] = business.phone
  if (business.email) node['email'] = business.email
  if (business.website) node['sameAs'] = business.website
  if (business.photoUrls.length > 0) node['image'] = business.photoUrls
  if (business.categories.length > 0) node['additionalType'] = business.categories

  if (business.latitude !== null && business.longitude !== null) {
    node['geo'] = {
      '@type': 'GeoCoordinates',
      latitude: business.latitude,
      longitude: business.longitude,
    }
  }

  if (business.priceLevel !== null) {
    // Schema.org expects a currency-symbol run, matching the UI's own display.
    node['priceRange'] = '₹'.repeat(Math.min(Math.max(business.priceLevel, 1), 4))
  }

  if (business.hours.length > 0) {
    node['openingHoursSpecification'] = openingHoursSpecification(business.hours)
  }

  if (business.reviewCount > 0 && business.rating > 0) {
    node['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: Number(business.rating.toFixed(1)),
      reviewCount: business.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  node['currenciesAccepted'] = market.currency

  return node
}

export type ReviewSeoInput = {
  authorName: string
  rating: number
  body: string
  createdAt: string
}

/** Individual `Review` nodes, which is what renders review snippets. */
export function reviewsJsonLd(reviews: ReviewSeoInput[]): JsonLd[] {
  return reviews.map((review) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: review.authorName },
    datePublished: review.createdAt.slice(0, 10),
    reviewBody: review.body,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }))
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[], locale: Locale): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localePath(locale, item.path)),
    })),
  }
}

export function websiteJsonLd(name: string, locale: Locale): JsonLd {
  const url = absoluteUrl(localePath(locale))
  return {
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name,
    url,
    inLanguage: localeMeta[locale].tag,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl(localePath(locale, '/search'))}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Wraps nodes in a single `@graph` and escapes the result for safe embedding.
 *
 * One script tag rather than several: cross-references between nodes resolve by
 * `@id` within a graph, and multiple competing blocks are a common cause of
 * validators picking the wrong one.
 *
 * The escaping matters. `JSON.stringify` does not touch `<`, so a business name
 * containing `</script>` would close the tag early and everything after it would
 * be parsed as HTML — script injection through a listing name, which is exactly
 * the kind of field an untrusted owner controls. Escaping `<`, `>`, and `&` as
 * unicode sequences keeps the JSON semantically identical while making it inert
 * inside a script element.
 */
export function jsonLdGraph(nodes: JsonLd[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
