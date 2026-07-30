import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookmarkPlus, Bell } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireUser } from '@/lib/auth'
import { getSavedSearches } from '@/lib/queries/saved'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/directory/empty-state'
import { SavedNav } from '@/components/saved/saved-nav'
import { DeleteSavedSearchButton } from '@/components/saved/saved-search-actions'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Saved searches.
 *
 * Stored as parameter pairs rather than a URL, so a saved search survives a change
 * to how search URLs are written, and can later be matched against new listings
 * for the notifications in Phase 11.
 */
export default async function SavedSearchesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  await requireUser(locale, `/${locale}/account/searches`)
  const dict = await getDictionary(locale)
  const searches = await getSavedSearches()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-display">{dict.saved.heading}</h1>

      <SavedNav
        locale={locale}
        active="searches"
        labels={{
          places: dict.saved.tabPlaces,
          lists: dict.saved.tabLists,
          searches: dict.saved.tabSearches,
        }}
      />

      {searches.length === 0 ? (
        <EmptyState
          icon={<BookmarkPlus />}
          title={dict.saved.searchesHeading}
          body={dict.saved.searchesEmpty}
          action={
            <Button asChild variant="outline">
              <Link href={`/${locale}/search`}>{dict.nav.search}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {searches.map((search) => {
            // `params` is jsonb, so it arrives as an object of unknown shape;
            // turning it back into a query string is what makes it runnable.
            const query = new URLSearchParams(
              Object.entries((search.params ?? {}) as Record<string, unknown>).map(
                ([key, value]) => [key, String(value)],
              ),
            ).toString()

            return (
              <li
                key={search.id}
                className="rounded-card border-line bg-surface flex flex-wrap items-center gap-3 border p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-base font-medium">{search.name}</p>
                  <p className="text-ink-muted mt-1 truncate font-mono text-xs">{query || '—'}</p>
                </div>

                {search.notify && (
                  <Badge variant="accent" className="gap-1.5">
                    <Bell className="size-3" aria-hidden />
                    {dict.saved.notifyLabel}
                  </Badge>
                )}

                <Button asChild variant="outline" size="sm">
                  <Link href={`/${locale}/search${query ? `?${query}` : ''}`}>
                    {dict.saved.runSearch}
                  </Link>
                </Button>

                <DeleteSavedSearchButton
                  searchId={search.id}
                  labels={{ delete: dict.saved.delete, errors: dict.saved.errors }}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
