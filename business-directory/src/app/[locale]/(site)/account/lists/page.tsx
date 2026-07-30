import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListPlus } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireUser } from '@/lib/auth'
import { getLists } from '@/lib/queries/saved'
import { interpolate } from '@/lib/i18n-content'
import { formatCount, formatRelative } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/directory/empty-state'
import { SavedNav } from '@/components/saved/saved-nav'
import { CreateListDialog } from '@/components/saved/list-forms'
import { listFormLabels } from '@/components/saved/list-labels'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Someone's lists. Signed-in only, so dynamic. */
export default async function ListsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  await requireUser(locale, `/${locale}/account/lists`)
  const dict = await getDictionary(locale)
  const lists = await getLists()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-display">{dict.saved.heading}</h1>
        <CreateListDialog labels={listFormLabels(dict)} />
      </header>

      <SavedNav
        locale={locale}
        active="lists"
        labels={{
          places: dict.saved.tabPlaces,
          lists: dict.saved.tabLists,
          searches: dict.saved.tabSearches,
        }}
      />

      {lists.length === 0 ? (
        <EmptyState icon={<ListPlus />} title={dict.saved.listsHeading} body={dict.saved.listsEmpty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {lists.map((list) => (
            <li
              key={list.id}
              className="rounded-card border-line bg-surface hover:border-line-strong border transition-colors duration-(--duration-hover)"
            >
              <Link href={`/${locale}/account/lists/${list.id}`} className="block p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink text-base font-medium">{list.name}</span>
                  <Badge variant={list.visibility === 'private' ? 'neutral' : 'accent'}>
                    {dict.saved.visibilityShort[list.visibility]}
                  </Badge>
                </div>
                {list.description && (
                  <p className="text-ink-muted mt-1 line-clamp-2 text-sm">{list.description}</p>
                )}
                <p className="num text-ink-muted mt-2 text-xs">
                  {interpolate(dict.saved.itemCount, {
                    count: formatCount(list.itemCount, locale),
                  })}
                  {' · '}
                  {formatRelative(list.updatedAt, locale)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
