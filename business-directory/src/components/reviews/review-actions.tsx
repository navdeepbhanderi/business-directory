'use client'

import { useActionState, useOptimistic, useState } from 'react'
import { Flag, ThumbsUp } from 'lucide-react'
import {
  replyToReviewAction,
  reportReviewAction,
  toggleVoteAction,
} from '@/lib/actions/reviews'
import { REPORT_REASONS } from '@/lib/review-schemas'
import type { ActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Helpful vote.
 *
 * The button answers immediately with `useOptimistic` and then reconciles: the
 * server action is awaited, and on success the viewer context is re-read so the
 * pressed state survives a re-sort. Without that reconciliation the button
 * reverted to unpressed the moment the list re-rendered, because the viewer
 * context still held the votes as they were at page load.
 *
 * Voting on your own review is refused by the insert policy, so there is no
 * check here — only a different, non-interactive presentation for the author.
 */
export function HelpfulButton({
  reviewId,
  count,
  voted,
  isAuthor,
  onChanged,
  labels,
}: {
  reviewId: string
  count: number
  voted: boolean
  isAuthor: boolean
  onChanged?: (() => void) | undefined
  labels: { helpful: string; ownReview: string; errors: Record<string, string> }
}) {
  const [error, setError] = useState<string | null>(null)
  const [optimistic, applyOptimistic] = useOptimistic(
    { voted, count },
    (_current, next: { voted: boolean; count: number }) => next,
  )

  if (isAuthor) {
    return (
      <span className="num text-xs text-ink-muted" title={labels.ownReview}>
        {count > 0 ? `${count} · ${labels.helpful}` : ''}
      </span>
    )
  }

  return (
    <form
      action={async (formData: FormData) => {
        setError(null)
        applyOptimistic({
          voted: !optimistic.voted,
          count: optimistic.count + (optimistic.voted ? -1 : 1),
        })

        const result = await toggleVoteAction({}, formData)
        const code = result.errors?.['form']
        if (code) setError(code)
        else onChanged?.()
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <button
        type="submit"
        aria-pressed={optimistic.voted}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs transition-colors duration-(--duration-hover)',
          optimistic.voted
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
        )}
      >
        <ThumbsUp className="size-3.5" aria-hidden />
        {labels.helpful}
        {optimistic.count > 0 && <span className="num">{optimistic.count}</span>}
      </button>
      {error && (
        <span role="alert" className="ms-2 text-xs text-danger">
          {labels.errors[error] ?? labels.errors['failed']}
        </span>
      )}
    </form>
  )
}

/**
 * Report a review.
 *
 * Reasons are a closed set: free text alone leaves a moderator guessing, and an
 * open field is the usual route for abuse arriving dressed as a report.
 */
export function ReportButton({
  reviewId,
  labels,
}: {
  reviewId: string
  labels: {
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
}) {
  const [state, formAction] = useActionState(reportReviewAction, {} as ActionState)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs text-ink-muted transition-colors duration-(--duration-hover) hover:text-danger"
        >
          <Flag className="size-3.5" aria-hidden />
          {labels.trigger}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        {state.ok ? (
          <p role="status" className="rounded-control bg-success-soft p-3 text-sm text-success">
            {labels.received}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="reviewId" value={reviewId} />

            {state.errors?.['form'] && (
              <p role="alert" className="text-sm text-danger">
                {labels.errors[state.errors['form']] ?? labels.errors['failed']}
              </p>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-ink">{labels.reasonLabel}</legend>
              {REPORT_REASONS.map((reason, index) => (
                <label key={reason} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    defaultChecked={index === 0}
                    required
                  />
                  {labels.reasons[reason] ?? reason}
                </label>
              ))}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-detail" className="text-sm font-medium text-ink">
                {labels.detailLabel}
              </label>
              <Textarea id="report-detail" name="detail" rows={3} maxLength={1000} />
            </div>

            <Button type="submit" variant="danger" className="sm:w-auto sm:self-start">
              {labels.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Owner reply. One per review, so posting again amends it. */
export function OwnerReplyForm({
  reviewId,
  businessId,
  existing,
  labels,
}: {
  reviewId: string
  businessId: string
  existing?: string | undefined
  labels: {
    trigger: string
    amend: string
    placeholder: string
    submit: string
    posted: string
    errors: Record<string, string>
  }
}) {
  const [state, formAction] = useActionState(replyToReviewAction, {} as ActionState)
  const [open, setOpen] = useState(false)

  if (state.ok) {
    return (
      <p role="status" className="mt-3 text-xs text-success">
        {labels.posted}
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 self-start text-xs text-accent underline-offset-4 hover:underline"
      >
        {existing ? labels.amend : labels.trigger}
      </button>
    )
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="businessId" value={businessId} />

      {state.errors?.['form'] && (
        <p role="alert" className="text-sm text-danger">
          {labels.errors[state.errors['form']] ?? labels.errors['failed']}
        </p>
      )}

      <Textarea
        name="body"
        rows={3}
        defaultValue={existing ?? ''}
        placeholder={labels.placeholder}
        maxLength={2000}
        required
      />
      <Button type="submit" size="sm" className="self-start">
        {labels.submit}
      </Button>
    </form>
  )
}
