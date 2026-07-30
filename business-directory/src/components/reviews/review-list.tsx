'use client'

import { useCallback, useState, useTransition } from 'react'
import type { Locale } from '@/i18n/config'
import { formatRelative } from '@/lib/format'
import { REVIEW_SORTS, type ReviewSort } from '@/lib/review-schemas'
import { RatingStars } from '@/components/directory/rating-stars'
import { cn } from '@/lib/utils'
import { useReviewViewer } from './viewer-context'
import { ReviewViewerControls, type ReviewControlLabels } from './viewer-controls'

export type ReviewRow = {
  id: string
  rating: number
  body: string
  created_at: string
  edited_at: string | null
  author_id: string
  author_name: string | null
  author_avatar: string | null
  helpful_count: number
  reply_body: string | null
  reply_created_at: string | null
  photo_paths: string[]
  total_count?: number
}

export type ReviewListLabels = {
  sortBy: string
  sort: Record<ReviewSort, string>
  yourReview: string
  edited: string
  loadMore: string
  empty: string
  controls: ReviewControlLabels
}

const PAGE_SIZE = 10

/**
 * The review list, with sorting and paging done in the browser.
 *
 * This is a Client Component holding server-rendered rows, not a client-only
 * fetch: `initial` is prerendered into the static HTML, so the reviews are in the
 * page for a crawler and for a visitor with no JavaScript. Sorting and paging
 * then call /api/reviews, which is why neither lives in the page's search params —
 * reading those would opt the whole route out of static rendering.
 */
export function ReviewList({
  businessId,
  locale,
  initial,
  total,
  labels,
}: {
  businessId: string
  locale: Locale
  initial: ReviewRow[]
  total: number
  labels: ReviewListLabels
}) {
  const viewer = useReviewViewer()
  const [rows, setRows] = useState(initial)
  const [sort, setSort] = useState<ReviewSort>('newest')
  const [pending, startTransition] = useTransition()
  const [failed, setFailed] = useState(false)

  const fetchPage = useCallback(
    async (nextSort: ReviewSort, offset: number) => {
      const response = await fetch(
        `/api/reviews?businessId=${businessId}&sort=${nextSort}&offset=${offset}&limit=${PAGE_SIZE}`,
      )
      if (!response.ok) throw new Error(String(response.status))
      return (await response.json()) as { items: ReviewRow[]; total: number }
    },
    [businessId],
  )

  function changeSort(next: ReviewSort) {
    if (next === sort) return
    setFailed(false)
    startTransition(async () => {
      try {
        const page = await fetchPage(next, 0)
        setRows(page.items)
        setSort(next)
      } catch {
        // The current ordering stays on screen rather than emptying the list.
        setFailed(true)
      }
    })
  }

  function loadMore() {
    setFailed(false)
    startTransition(async () => {
      try {
        const page = await fetchPage(sort, rows.length)
        setRows((current) => [...current, ...page.items])
      } catch {
        setFailed(true)
      }
    })
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">{labels.empty}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={labels.sortBy}
        className="flex flex-wrap items-center gap-2"
        data-pending={pending ? 'true' : undefined}
      >
        <span className="text-sm text-ink-muted">{labels.sortBy}</span>
        {REVIEW_SORTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => changeSort(option)}
            aria-pressed={sort === option}
            className={cn(
              'rounded-pill px-3 py-1 text-sm transition-colors duration-(--duration-hover)',
              sort === option
                ? 'bg-accent font-medium text-accent-ink'
                : 'border border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {labels.sort[option]}
          </button>
        ))}
      </div>

      <ul
        className={cn(
          'flex flex-col gap-4 transition-opacity duration-(--duration-hover)',
          pending && 'opacity-60',
        )}
        aria-busy={pending}
      >
        {rows.map((review) => {
          const isOwn = viewer.ownReview?.id === review.id
          return (
            <li
              key={review.id}
              className={cn(
                'rounded-card border bg-surface p-4',
                isOwn ? 'border-accent/50' : 'border-line',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">
                  {isOwn ? labels.yourReview : (review.author_name ?? '—')}
                </span>
                {/*
                  * A relative time is computed from "now", so the prerendered
                  * string and the hydrated one legitimately differ — the page was
                  * built an hour ago and the browser reads it now. Without the
                  * suppression React treats that as a hydration mismatch and
                  * throws away the server HTML for the subtree, which showed up
                  * as React error #418 on every listing page. `dateTime` carries
                  * the exact instant for machines regardless.
                  */}
                <time
                  dateTime={review.created_at}
                  suppressHydrationWarning
                  className="text-xs text-ink-muted"
                >
                  {formatRelative(review.created_at, locale)}
                  {review.edited_at && ` · ${labels.edited}`}
                </time>
              </div>

              <RatingStars
                value={review.rating}
                locale={locale}
                size="sm"
                showValue={false}
                className="mt-2"
              />

              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{review.body}</p>

              {review.photo_paths.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {review.photo_paths.map((path) => (
                    <li key={path}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- user upload, fixed thumbnail */}
                      <img
                        src={path}
                        alt=""
                        className="size-20 rounded-control border border-line object-cover"
                        loading="lazy"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {review.reply_body && (
                <div className="mt-3 rounded-card border-s-2 border-accent bg-surface-sunken p-3">
                  <p className="text-xs font-medium text-ink">{labels.controls.replyHeading}</p>
                  <p className="mt-1 text-sm text-ink-muted">{review.reply_body}</p>
                </div>
              )}

              <ReviewViewerControls
                reviewId={review.id}
                businessId={businessId}
                helpfulCount={Number(review.helpful_count)}
                replyBody={review.reply_body}
                labels={labels.controls}
              />
            </li>
          )
        })}
      </ul>

      {failed && (
        <p role="status" className="text-sm text-ink-muted">
          {labels.controls.errors['failed']}
        </p>
      )}

      {rows.length < total && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="self-start rounded-pill border border-line px-4 py-2 text-sm text-ink transition-colors duration-(--duration-hover) hover:border-line-strong disabled:opacity-60"
        >
          {labels.loadMore}
        </button>
      )}
    </div>
  )
}
