import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, locales, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { getSharedList } from '@/lib/queries/saved'
import { localizedText, interpolate } from '@/lib/i18n-content'
import { formatCount } from '@/lib/format'
import { absoluteUrl, localePath } from '@/lib/seo'
import { BusinessCard } from '@/components/directory/business-card'

/**
 * A shared list, as a stranger holding the link sees it.
 *
 * Read with the anon client through `shared_list`, which takes the slug. The
 * policies deliberately hide lists from everyone but their owner, so holding the
 * link is the whole credential — and it is a random 96-bit slug rather than
 * anything derived from the name.
 *
 * Two consequences worth stating. `noindex`: an unlisted list is not for search
 * engines even though the page is public, and a `public` list is only *eligible*
 * to be featured, which is a Phase 11 decision rather than an invitation to
 * crawl. And a listing that has been unpublished drops out, because the same
 * function that reads the list applies the same rule as everywhere else.
 */

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}

  const loaded = await getSharedList(slug)
  if (!loaded) return { robots: { index: false, follow: false } }

  const dict = await getDictionary(locale)

  return {
    title: loaded.list.name,
    description:
      loaded.list.description ??
      interpolate(dict.saved.byOwner, { name: loaded.list.owner_name ?? '' }),
    robots: { index: false, follow: false },
    alternates: {
      canonical: absoluteUrl(localePath(locale, `/list/${slug}`)),
      languages: Object.fromEntries(
        locales.map((other: Locale) => [other, absoluteUrl(localePath(other, `/list/${slug}`))]),
      ),
    },
  }
}

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const [dict, loaded] = await Promise.all([getDictionary(locale), getSharedList(slug)])
  // A revoked share link and a slug that never existed are the same 404. Anything
  // else would confirm that a list is there.
  if (!loaded) notFound()

  const { list, items } = loaded

  const cardLabels = {
    verified: dict.business.verified,
    reviews: dict.business.reviews,
    promoted: dict.business.promoted,
    openNow: dict.business.openNow,
    closed: dict.business.closed,
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display">{list.name}</h1>
        {list.owner_name && (
          <p className="text-ink-muted text-sm">
            {interpolate(dict.saved.byOwner, { name: list.owner_name })}
          </p>
        )}
        {list.description && <p className="text-ink text-base">{list.description}</p>}
        <p className="num text-ink-muted text-sm">
          {interpolate(dict.saved.itemCount, { count: formatCount(items.length, locale) })}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-card border-line bg-surface-sunken text-ink-muted border p-4 text-sm">
          {dict.saved.sharedEmpty}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((row) => {
            const name = localizedText(row.name, row.name_i18n, locale)
            return (
              <li key={row.id}>
                <BusinessCard
                  variant="list"
                  locale={locale}
                  labels={cardLabels}
                  href={`/${locale}/business/${row.slug}`}
                  business={{
                    id: row.id,
                    slug: row.slug,
                    name,
                    cityName: row.city_name,
                    localityName: row.locality_name,
                    addressLine1: row.address_line1,
                    rating: Number(row.rating),
                    reviewCount: row.review_count,
                    priceLevel: row.price_level,
                    amenities: [],
                    verified: row.verified,
                    distanceKm: null,
                    isOpen: row.is_open,
                    promoted: false,
                    categoryLabels: [],
                    photoUrl: row.photo_url,
                  }}
                />
                {/* The owner's note is the reason the list is worth sending. */}
                {row.note && (
                  <p className="border-accent text-ink-muted mt-2 border-s-2 ps-3 text-sm italic">
                    {row.note}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
