import { describe, expect, it } from 'vitest'
import {
  absoluteUrl,
  alternateLanguages,
  breadcrumbJsonLd,
  businessJsonLd,
  jsonLdGraph,
  openingHoursSpecification,
  reviewsJsonLd,
  websiteJsonLd,
  type BusinessSeoInput,
} from './seo'

/**
 * Rich results fail silently: a missing required field means no stars in search,
 * with no error anywhere. So the structured data is asserted here rather than
 * validated once by hand and assumed to stay correct.
 */

const base: BusinessSeoInput = {
  slug: 'iyengar-bakery-bengaluru',
  name: 'Iyengar Bakery',
  description: 'A neighbourhood bakery in Jayanagar.',
  addressLine1: '96, Jayanagar Main Road',
  postalCode: '560041',
  cityName: 'Bengaluru',
  localityName: 'Jayanagar',
  state: 'Karnataka',
  countryCode: 'IN',
  latitude: 12.9279,
  longitude: 77.5937,
  phone: '+91 98250 10101',
  website: 'https://example.com',
  priceLevel: 2,
  rating: 4.3,
  reviewCount: 7,
  photoUrls: ['https://images.example.com/a.jpg'],
  hours: [
    { dayOfWeek: 1, opens: '09:00', closes: '21:00' },
    { dayOfWeek: 2, opens: '09:00', closes: '21:00' },
    { dayOfWeek: 6, opens: '10:00', closes: '14:00' },
  ],
  categories: ['Sweets & Bakery'],
}

describe('absoluteUrl', () => {
  it('produces an absolute URL', () => {
    expect(absoluteUrl('/en/search')).toMatch(/^https?:\/\/.+\/en\/search$/)
  })
})

describe('alternateLanguages', () => {
  it('includes every shipped locale plus x-default', () => {
    const map = alternateLanguages('/business/x')
    expect(Object.keys(map)).toContain('en-IN')
    expect(Object.keys(map)).toContain('hi-IN')
    expect(map['x-default']).toContain('/en/business/x')
  })

  it('emits absolute URLs, which hreflang requires', () => {
    for (const value of Object.values(alternateLanguages('/'))) {
      expect(value).toMatch(/^https?:\/\//)
    }
  })
})

describe('businessJsonLd', () => {
  const node = businessJsonLd(base, 'en')

  it('is a LocalBusiness with a stable @id', () => {
    expect(node['@type']).toBe('LocalBusiness')
    expect(String(node['@id'])).toMatch(/#business$/)
  })

  it('includes a complete PostalAddress', () => {
    expect(node['address']).toMatchObject({
      '@type': 'PostalAddress',
      streetAddress: '96, Jayanagar Main Road',
      addressLocality: 'Jayanagar',
      addressRegion: 'Karnataka',
      postalCode: '560041',
      addressCountry: 'IN',
    })
  })

  it('includes GeoCoordinates when known', () => {
    expect(node['geo']).toMatchObject({
      '@type': 'GeoCoordinates',
      latitude: 12.9279,
      longitude: 77.5937,
    })
  })

  it('omits geo entirely when coordinates are missing', () => {
    const without = businessJsonLd({ ...base, latitude: null, longitude: null }, 'en')
    expect(without['geo']).toBeUndefined()
  })

  it('emits an AggregateRating that satisfies the rich-result requirements', () => {
    expect(node['aggregateRating']).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: 4.3,
      reviewCount: 7,
      bestRating: 5,
      worstRating: 1,
    })
  })

  it('omits AggregateRating when there are no reviews', () => {
    // Google rejects an aggregate rating with reviewCount 0, and a rejected
    // block can invalidate the surrounding graph.
    const fresh = businessJsonLd({ ...base, rating: 0, reviewCount: 0 }, 'en')
    expect(fresh['aggregateRating']).toBeUndefined()
  })

  it('rounds the rating to one decimal', () => {
    const node = businessJsonLd({ ...base, rating: 4.25 }, 'en')
    expect((node['aggregateRating'] as { ratingValue: number }).ratingValue).toBe(4.3)
  })

  it('renders priceRange as a currency-symbol run matching the UI', () => {
    expect(businessJsonLd({ ...base, priceLevel: 3 }, 'en')['priceRange']).toBe('₹₹₹')
    expect(businessJsonLd({ ...base, priceLevel: null }, 'en')['priceRange']).toBeUndefined()
  })

  it('omits optional contact fields rather than emitting empty strings', () => {
    const sparse = businessJsonLd(
      { ...base, description: null, phone: null, email: null, website: null, photoUrls: [] },
      'en',
    )
    for (const key of ['description', 'telephone', 'email', 'sameAs', 'image']) {
      expect(sparse[key], key).toBeUndefined()
    }
  })

  it('points url at the locale-prefixed listing page', () => {
    expect(String(node['url'])).toContain('/en/business/iyengar-bakery-bengaluru')
    expect(String(businessJsonLd(base, 'hi')['url'])).toContain('/hi/business/')
  })
})

describe('openingHoursSpecification', () => {
  it('groups days that share the same hours', () => {
    const spec = openingHoursSpecification(base.hours)
    expect(spec).toHaveLength(2)
    expect(spec[0]).toMatchObject({
      '@type': 'OpeningHoursSpecification',
      opens: '09:00',
      closes: '21:00',
    })
    expect((spec[0] as { dayOfWeek: string[] }).dayOfWeek).toEqual([
      'https://schema.org/Monday',
      'https://schema.org/Tuesday',
    ])
  })

  it('keeps split shifts as separate entries', () => {
    const spec = openingHoursSpecification([
      { dayOfWeek: 1, opens: '11:00', closes: '15:00' },
      { dayOfWeek: 1, opens: '18:30', closes: '22:30' },
    ])
    expect(spec).toHaveLength(2)
  })

  it('returns nothing for no hours, so the field can be omitted', () => {
    expect(openingHoursSpecification([])).toEqual([])
  })

  it('uses schema.org day URLs, not bare names', () => {
    const spec = openingHoursSpecification([{ dayOfWeek: 0, opens: '09:00', closes: '17:00' }])
    expect((spec[0] as { dayOfWeek: string[] }).dayOfWeek[0]).toBe('https://schema.org/Sunday')
  })
})

describe('reviewsJsonLd', () => {
  it('emits a Review per input with a bounded rating', () => {
    const nodes = reviewsJsonLd([
      {
        authorName: 'Priya Patel',
        rating: 5,
        body: 'Excellent.',
        createdAt: '2026-05-01T10:00:00Z',
      },
    ])
    expect(nodes[0]).toMatchObject({
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Priya Patel' },
      datePublished: '2026-05-01',
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1 },
    })
  })

  it('emits an empty list for no reviews', () => {
    expect(reviewsJsonLd([])).toEqual([])
  })
})

describe('breadcrumbJsonLd', () => {
  it('numbers positions from 1 and uses absolute item URLs', () => {
    const node = breadcrumbJsonLd(
      [
        { name: 'Home', path: '' },
        { name: 'Bengaluru', path: '/search?city=bengaluru' },
      ],
      'en',
    )
    const items = node['itemListElement'] as { position: number; item: string }[]
    expect(items[0]?.position).toBe(1)
    expect(items[1]?.position).toBe(2)
    expect(items[0]?.item).toMatch(/^https?:\/\//)
  })
})

describe('websiteJsonLd', () => {
  it('declares a SearchAction pointing at the search route', () => {
    const node = websiteJsonLd('Openly', 'en')
    expect(node['@type']).toBe('WebSite')
    const action = node['potentialAction'] as { target: { urlTemplate: string } }
    expect(action.target.urlTemplate).toContain('/en/search?q={search_term_string}')
  })
})

describe('jsonLdGraph', () => {
  it('produces one parseable graph with a context', () => {
    const raw = jsonLdGraph([businessJsonLd(base, 'en'), breadcrumbJsonLd([], 'en')])
    const parsed = JSON.parse(raw) as { '@context': string; '@graph': unknown[] }
    expect(parsed['@context']).toBe('https://schema.org')
    expect(parsed['@graph']).toHaveLength(2)
  })

  it('escapes angle brackets so a listing name cannot break out of the script tag', () => {
    // A business name is owner-controlled text. Without escaping, `</script>`
    // in a name would close the element early and turn the rest into HTML.
    const raw = jsonLdGraph([businessJsonLd({ ...base, name: 'A </script><img> B' }, 'en')])
    expect(raw).not.toContain('</script>')
    expect(raw).not.toContain('<img>')
    expect(raw).toContain('\\u003c')

    // Still valid JSON with the original value intact once parsed.
    const parsed = JSON.parse(raw) as { '@graph': { name: string }[] }
    expect(parsed['@graph'][0]?.name).toBe('A </script><img> B')
  })

  it('escapes ampersands without corrupting the value', () => {
    const raw = jsonLdGraph([businessJsonLd({ ...base, name: 'Tea & Toast' }, 'en')])
    expect(raw).not.toContain('&')
    const parsed = JSON.parse(raw) as { '@graph': { name: string }[] }
    expect(parsed['@graph'][0]?.name).toBe('Tea & Toast')
  })
})
