import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'
import { getSitemapEntries } from '@/lib/queries/businesses'
import { absoluteUrl, localePath } from '@/lib/seo'

/**
 * Sitemap, generated from the database.
 *
 * Every published listing, every city and category browse page, and the static
 * pages — each with an `alternates.languages` map so a crawler discovers the
 * other locales rather than treating them as duplicates.
 *
 * Regenerated hourly. A listing published between rebuilds appears at the next
 * revalidation instead of waiting for a deploy.
 */

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { businesses, cities, categories } = await getSitemapEntries()

  const languagesFor = (path: string) =>
    Object.fromEntries(locales.map((locale) => [locale, absoluteUrl(localePath(locale, path))]))

  const entry = (
    path: string,
    options: {
      priority: number
      changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
      lastModified?: Date
    },
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(localePath('en', path)),
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: { languages: languagesFor(path) },
  })

  return [
    entry('', { priority: 1, changeFrequency: 'daily' }),
    entry('/search', { priority: 0.6, changeFrequency: 'daily' }),
    entry('/about', { priority: 0.3, changeFrequency: 'yearly' }),
    entry('/guidelines', { priority: 0.3, changeFrequency: 'yearly' }),
    entry('/contact', { priority: 0.3, changeFrequency: 'yearly' }),

    // Browse surfaces. Lower priority than listings but genuinely indexable,
    // and they are how a crawler reaches deep listings.
    ...cities.map((slug) =>
      entry(`/search?city=${slug}`, { priority: 0.7, changeFrequency: 'daily' }),
    ),
    ...categories.map((slug) =>
      entry(`/search?category=${slug}`, { priority: 0.7, changeFrequency: 'daily' }),
    ),

    // The listings themselves — the point of the whole exercise.
    ...businesses.map((business) =>
      entry(`/business/${business.slug}`, {
        priority: 0.9,
        changeFrequency: 'weekly',
        lastModified: business.updated_at ? new Date(business.updated_at) : undefined,
      }),
    ),
  ]
}
