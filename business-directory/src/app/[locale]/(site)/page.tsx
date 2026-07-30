import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, MapPin, Search } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import {
  getCategories,
  getCities,
  getDirectoryStats,
  searchBusinesses,
} from '@/lib/queries/businesses'
import { localizedText } from '@/lib/i18n-content'
import { formatCount } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { BusinessCard } from '@/components/directory/business-card'
import { SectionHeading } from '@/components/directory/section-heading'

/**
 * Home.
 *
 * Every listing, category, and city here comes from the database. Nothing is
 * placeholder content — which is the point of building the data layer before
 * the interface.
 */

export const revalidate = 3600

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const dict = await getDictionary(locale)
  const base = `/${locale}`

  const [categories, cities, featured, stats] = await Promise.all([
    getCategories(),
    getCities(),
    searchBusinesses({ sort: 'rating', pageSize: 6, minRating: 4 }),
    getDirectoryStats(),
  ])

  const categoryLabel = new Map(
    categories.map((c) => [c.slug, localizedText(c.name, c.name_i18n, locale)]),
  )

  const cardLabels = {
    verified: dict.business.verified,
    reviews: dict.business.reviews,
    promoted: dict.business.promoted,
    openNow: dict.business.openNow,
    closed: dict.business.closed,
  }

  return (
    <>
      <section className="border-line bg-surface border-b">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-eyebrow text-accent">{dict.home.hero.eyebrow}</p>
            <h1 className="text-display mt-3 max-w-2xl">{dict.home.hero.title}</h1>
            <p className="text-ink-muted mt-5 max-w-xl text-lg">{dict.home.hero.subtitle}</p>

            <form
              action={`${base}/search`}
              className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <label htmlFor="hero-search" className="sr-only">
                  {dict.nav.search}
                </label>
                <Search
                  className="text-ink-muted pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2"
                  aria-hidden
                />
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  placeholder={dict.home.hero.searchPlaceholder}
                  className="rounded-control border-line-strong bg-surface text-ink placeholder:text-ink-muted hover:border-ink-muted h-12 w-full border ps-12 pe-4 text-base transition-colors duration-(--duration-hover)"
                />
              </div>
              <Button type="submit" size="lg">
                {dict.home.hero.searchButton}
              </Button>
            </form>
          </div>

          {/* Live coverage figures. Read from the database, so they cannot drift
              from reality the way a hardcoded "10,000+ listings" would. */}
          <dl className="border-line grid grid-cols-2 gap-x-10 gap-y-6 border-t pt-8 lg:border-s lg:border-t-0 lg:ps-10 lg:pt-0">
            {[
              { label: dict.home.stats.listings, value: stats.listings },
              { label: dict.home.stats.cities, value: stats.cities },
              { label: dict.home.stats.categories, value: stats.categories },
              { label: dict.home.stats.reviews, value: stats.reviews },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-eyebrow text-ink-muted">{stat.label}</dt>
                <dd className="num font-display text-ink mt-1 text-3xl font-semibold">
                  {formatCount(stat.value, locale)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow={dict.home.categories.eyebrow}
          title={dict.home.categories.title}
          description={dict.home.categories.description}
        />
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`${base}/search?category=${category.slug}`}
                className="rounded-card border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-surface-sunken flex h-full items-center border px-4 py-3.5 text-sm font-medium transition-colors duration-(--duration-hover)"
              >
                {localizedText(category.name, category.name_i18n, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-line bg-surface border-y">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow={dict.home.cities.eyebrow}
            title={dict.home.cities.title}
            description={dict.home.cities.description}
          />
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {cities.map((city) => (
              <li key={city.id}>
                <Link
                  href={`${base}/search?city=${city.slug}`}
                  className="rounded-pill border-line bg-paper text-ink hover:border-line-strong hover:bg-surface-sunken inline-flex items-center gap-1.5 border px-4 py-2 text-sm transition-colors duration-(--duration-hover)"
                >
                  <MapPin className="text-ink-muted size-3.5" aria-hidden />
                  {localizedText(city.name, city.name_i18n, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow={dict.home.featured.eyebrow}
          title={dict.home.featured.title}
          description={dict.home.featured.description}
          action={
            <Button asChild variant="outline">
              <Link href={`${base}/search`}>
                {dict.home.featured.viewAll}
                <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          }
        />

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.items.map((row) => (
            <BusinessCard
              key={row.id}
              locale={locale}
              labels={cardLabels}
              href={`${base}/business/${row.slug}`}
              business={{
                slug: row.slug,
                name: localizedText(row.name, row.name_i18n, locale),
                cityName: row.city_name,
                localityName: row.locality_name,
                addressLine1: row.address_line1,
                rating: row.rating,
                reviewCount: row.review_count,
                priceLevel: row.price_level,
                amenities: row.amenities,
                verified: row.verified,
                distanceKm: row.distance_km,
                isOpen: row.is_open,
                promoted: row.promoted,
                photoUrl: row.photo_url,
                categoryLabels: row.category_slugs
                  .map((slug) => categoryLabel.get(slug))
                  .filter((label): label is string => Boolean(label)),
              }}
            />
          ))}
        </div>
      </section>
    </>
  )
}
