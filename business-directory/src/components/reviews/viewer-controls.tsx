'use client'

import { canStillEdit } from '@/lib/review-schemas'
import { useReviewViewer } from './viewer-context'
import { HelpfulButton, OwnerReplyForm, ReportButton } from './review-actions'
import { ReviewComposer, type ComposerLabels } from './review-composer'

export type ReviewControlLabels = {
  helpful: string
  ownReview: string
  replyHeading: string
  report: {
    trigger: string
    title: string
    description: string
    reasonLabel: string
    reasons: Record<string, string>
    detailLabel: string
    submit: string
    received: string
    errors: Record<string, string>
  }
  reply: {
    trigger: string
    amend: string
    placeholder: string
    submit: string
    posted: string
    errors: Record<string, string>
  }
  errors: Record<string, string>
}

/**
 * The controls on a review that depend on who is looking.
 *
 * Vote state, the report button, and the owner's reply form all need the viewer's
 * identity, which arrives after mount from /api/review-context. Until it does,
 * nothing viewer-specific is offered — the vote count is still shown, because it
 * is public.
 */
export function ReviewViewerControls({
  reviewId,
  businessId,
  helpfulCount,
  replyBody,
  labels,
}: {
  reviewId: string
  businessId: string
  helpfulCount: number
  replyBody: string | null
  labels: ReviewControlLabels
}) {
  const viewer = useReviewViewer()
  const isAuthor = viewer.ownReview?.id === reviewId
  const voted = viewer.votes.includes(reviewId)

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <HelpfulButton
          reviewId={reviewId}
          count={helpfulCount}
          voted={voted}
          isAuthor={isAuthor}
          onChanged={viewer.refresh}
          labels={{
            helpful: labels.helpful,
            ownReview: labels.ownReview,
            errors: labels.errors,
          }}
        />
        {viewer.signedIn && !isAuthor && <ReportButton reviewId={reviewId} labels={labels.report} />}
      </div>

      {viewer.ownsBusiness && (
        <OwnerReplyForm
          reviewId={reviewId}
          businessId={businessId}
          existing={replyBody ?? undefined}
          labels={labels.reply}
        />
      )}
    </>
  )
}

/**
 * The composer, or the reason there is not one.
 *
 * Before the viewer context loads this shows the guest form. That is deliberate:
 * it is immediately usable, the draft survives either way, and it never has to be
 * replaced by something more restrictive once the answer arrives.
 */
export function ComposerSlot({
  businessId,
  businessSlug,
  locale,
  labels,
  editLabels,
  cannot,
}: {
  businessId: string
  businessSlug: string
  locale: string
  labels: ComposerLabels
  editLabels: ComposerLabels
  cannot: Record<string, string>
}) {
  const viewer = useReviewViewer()

  if (!viewer.loaded || !viewer.signedIn) {
    return (
      <ReviewComposer
        businessId={businessId}
        businessSlug={businessSlug}
        locale={locale}
        signedIn={false}
        labels={labels}
      />
    )
  }

  if (viewer.canReview) {
    return (
      <ReviewComposer
        businessId={businessId}
        businessSlug={businessSlug}
        locale={locale}
        signedIn
        labels={labels}
      />
    )
  }

  const own = viewer.ownReview
  if (own && canStillEdit(own.createdAt)) {
    return (
      <ReviewComposer
        businessId={businessId}
        businessSlug={businessSlug}
        locale={locale}
        signedIn
        existing={{ id: own.id, rating: own.rating, body: own.body }}
        labels={editLabels}
      />
    )
  }

  // A refusal is explained rather than expressed as a disabled button.
  const reason = viewer.reason ?? 'already-reviewed'
  const message = cannot[reason] ?? cannot['already-reviewed']

  return (
    <p className="rounded-card border border-line bg-surface-sunken p-4 text-sm text-ink-muted">
      {message}
    </p>
  )
}
