import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireUser } from '@/lib/auth'
import { getList } from '@/lib/queries/saved'
import { localizedText, interpolate } from '@/lib/i18n-content'
import { formatCount } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { BusinessCard } from '@/components/directory/business-card'
import { SavedNav } from '@/components/saved/saved-nav'
import {
  DeleteListButton,
  EditListDialog,
  ListItemControls,
  ShareControls,
} from '@/components/saved/list-forms'
import { listFormLabels } from '@/components/saved/list-labels'
import { CardActions } from '@/components/saved/card-actions'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * One list, as its owner sees it: notes, order, sharing, and removal.
 *
 * A list belonging to someone else is a 404 rather than a 403 — RLS returns no
 * row, so this page cannot tell whether the id exists, and neither can a visitor
 * probing ids.
 */
export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()

  await requireUser(locale, `/${locale}/account/lists/${id}`)
  const dict = await getDictionary(locale)

  const loaded = await getList(id)
  if (!loaded) notFound()

  const { list, items } = loaded
  const order = items.map((row) => row.id)

  const cardLabels = {
    verified: dict.business.verified,
    reviews: dict.business.reviews,
    promoted: dict.business.promoted,
    openNow: dict.business.openNow,
    closed: dict.business.closed,
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <SavedNav
        locale={locale}
        active="lists"
        labels={{
          places: dict.saved.tabPlaces,
          lists: dict.saved.tabLists,
          searches: dict.saved.tabSearches,
        }}
      />

      <Link
        href={`/${locale}/account/lists`}
        className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {dict.saved.tabLists}
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-display">{list.name}</h1>
            {list.description && <p className="text-ink-muted mt-2 text-sm">{list.description}</p>}
            <p className="num text-ink-muted mt-2 text-sm">
              {interpolate(dict.saved.itemCount, { count: formatCount(items.length, locale) })}
            </p>
          </div>
          <Badge variant={list.visibility === 'private' ? 'neutral' : 'accent'}>
            {dict.saved.visibilityShort[list.visibility]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <EditListDialog
            list={{
              id: list.id,
              name: list.name,
              description: list.description,
              visibility: list.visibility,
            }}
            labels={listFormLabels(dict)}
          />
          <DeleteListButton
            listId={list.id}
            labels={{ delete: dict.saved.delete, confirm: dict.saved.deleteConfirm }}
          />
        </div>
      </header>

      <ShareControls
        list={{
          id: list.id,
          name: list.name,
          description: list.description,
          visibility: list.visibility,
          shareSlug: list.share_slug,
        }}
        locale={locale}
        labels={{
          heading: dict.saved.shareHeading,
          body: dict.saved.shareBody,
          copy: dict.saved.copyLink,
          copied: dict.saved.copied,
          turnOff: dict.saved.shareOff,
          turnOffNote: dict.saved.shareOffNote,
          share: dict.saved.shareHeading,
          errors: dict.saved.errors,
        }}
      />

      {items.length === 0 ? (
        <p className="rounded-card border-line bg-surface-sunken text-ink-muted border p-4 text-sm">
          {dict.saved.emptyList}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((row, index) => {
            const name = localizedText(row.name, row.name_i18n, locale)
            return (
              <li key={row.id}>
                <BusinessCard
                  variant="list"
                  locale={locale}
                  labels={cardLabels}
                  href={`/${locale}/business/${row.slug}`}
                  actions={
                    <CardActions
                      businessId={row.id}
                      businessName={name}
                      locale={locale}
                      dict={dict}
                    />
                  }
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
                <ListItemControls
                  listId={list.id}
                  businessId={row.id}
                  note={row.note}
                  canMoveUp={index > 0}
                  canMoveDown={index < items.length - 1}
                  order={order}
                  labels={{
                    notePlaceholder: dict.saved.notePlaceholder,
                    noteSave: dict.saved.noteSave,
                    remove: dict.saved.remove,
                    moveUp: dict.saved.moveUp,
                    moveDown: dict.saved.moveDown,
                    errors: dict.saved.errors,
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
