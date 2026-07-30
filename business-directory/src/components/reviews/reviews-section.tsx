import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries/en'
import { formatCount } from '@/lib/format'
import { interpolate } from '@/lib/i18n-content'
import { EDIT_WINDOW_HOURS } from '@/lib/review-schemas'
import { RatingBreakdown, RatingStars } from '@/components/directory/rating-stars'
import { ReviewViewerProvider } from './viewer-context'
import { ReviewList, type ReviewRow } from './review-list'
import { ComposerSlot } from './viewer-controls'

/**
 * The reviews section.
 *
 * A Server Component: the summary, the distribution, and the first page of
 * reviews are all rendered here from published data with no session read, which
 * is what keeps the listing page statically generated and the reviews indexable.
 * Everything that depends on the viewer — vote state, the composer, the owner's
 * reply form — is a small island beneath ReviewViewerProvider.
 */
export function ReviewsSection({
  businessId,
  businessSlug,
  locale,
  dict,
  reviews,
  total,
  counts,
  averageRating,
}: {
  businessId: string
  businessSlug: string
  locale: Locale
  dict: Dictionary
  reviews: ReviewRow[]
  total: number
  counts: Record<1 | 2 | 3 | 4 | 5, number>
  averageRating: number
}) {
  const starLabels = {
    1: interpolate(dict.business.starCount, { count: 1 }),
    2: interpolate(dict.business.starCountPlural, { count: 2 }),
    3: interpolate(dict.business.starCountPlural, { count: 3 }),
    4: interpolate(dict.business.starCountPlural, { count: 4 }),
    5: interpolate(dict.business.starCountPlural, { count: 5 }),
  } as const

  const composerLabels = {
    heading: dict.reviews.writeHeading,
    ratingLegend: dict.reviews.ratingLegend,
    starLabels: [starLabels[1], starLabels[2], starLabels[3], starLabels[4], starLabels[5]] as [
      string,
      string,
      string,
      string,
      string,
    ],
    bodyLabel: dict.reviews.bodyLabel,
    bodyPlaceholder: dict.reviews.bodyPlaceholder,
    bodyHint: dict.reviews.bodyHint,
    photosLabel: dict.reviews.photosLabel,
    photosHint: dict.reviews.photosHint,
    submit: dict.reviews.submit,
    update: dict.reviews.update,
    posted: dict.reviews.posted,
    signInPrompt: dict.reviews.signInPrompt,
    signInCta: dict.reviews.signInCta,
    draftRestored: dict.reviews.draftRestored,
    errors: {
      ...dict.reviews.errors,
      'edit-window-closed': interpolate(dict.reviews.errors['edit-window-closed'], {
        hours: EDIT_WINDOW_HOURS,
      }),
    },
  }

  return (
    <ReviewViewerProvider businessId={businessId}>
      <section id="reviews" className="flex flex-col gap-6">
        <h2 className="text-xl">{dict.reviews.heading}</h2>

        {total > 0 && (
          <div className="grid gap-6 sm:grid-cols-[14rem_1fr]">
            <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
              <div className="text-center">
                <p className="num font-display text-4xl">{averageRating.toFixed(1)}</p>
                <RatingStars
                  value={averageRating}
                  locale={locale}
                  size="sm"
                  showValue={false}
                  className="mt-1 justify-center"
                />
                <p className="num mt-1 text-xs text-ink-muted">
                  {formatCount(total, locale)} {dict.business.reviews}
                </p>
              </div>
              <RatingBreakdown counts={counts} locale={locale} starLabels={starLabels} />
            </div>

            <ReviewList
              businessId={businessId}
              locale={locale}
              initial={reviews}
              total={total}
              labels={{
                sortBy: dict.reviews.sortBy,
                sort: dict.reviews.sort,
                yourReview: dict.reviews.yourReview,
                edited: dict.reviews.edited,
                loadMore: dict.reviews.loadMore,
                empty: dict.reviews.empty,
                controls: {
                  helpful: dict.reviews.helpful,
                  ownReview: dict.reviews.ownReview,
                  replyHeading: dict.reviews.replyHeading,
                  errors: dict.reviews.errors,
                  report: {
                    trigger: dict.reviews.report,
                    title: dict.reviews.reportTitle,
                    description: dict.reviews.reportDescription,
                    reasonLabel: dict.reviews.reportReasonLabel,
                    reasons: dict.reviews.reasons,
                    detailLabel: dict.reviews.reportDetailLabel,
                    submit: dict.reviews.reportSubmit,
                    received: dict.reviews.reportReceived,
                    errors: dict.reviews.errors,
                  },
                  reply: {
                    trigger: dict.reviews.reply,
                    amend: dict.reviews.replyAmend,
                    placeholder: dict.reviews.replyPlaceholder,
                    submit: dict.reviews.replySubmit,
                    posted: dict.reviews.replyPosted,
                    errors: dict.reviews.errors,
                  },
                },
              }}
            />
          </div>
        )}

        {/* The composer, or an explanation of why there is not one. */}
        <div id="write-review" className="scroll-mt-24">
          <ComposerSlot
            businessId={businessId}
            businessSlug={businessSlug}
            locale={locale}
            labels={composerLabels}
            editLabels={{ ...composerLabels, heading: dict.reviews.editHeading }}
            cannot={dict.reviews.cannot}
          />
        </div>
      </section>
    </ReviewViewerProvider>
  )
}
