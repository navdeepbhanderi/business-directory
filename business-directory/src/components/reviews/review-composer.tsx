'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { submitReviewAction, editReviewAction } from '@/lib/actions/reviews'
import { REVIEW_MAX_LENGTH, REVIEW_MAX_PHOTOS, REVIEW_MIN_LENGTH } from '@/lib/review-schemas'
import type { ActionState } from '@/lib/actions/auth'
import { RatingInput } from '@/components/directory/rating-input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { interpolate } from '@/lib/i18n-content'
import { cn } from '@/lib/utils'

export type ComposerLabels = {
  heading: string
  ratingLegend: string
  starLabels: [string, string, string, string, string]
  bodyLabel: string
  bodyPlaceholder: string
  bodyHint: string
  photosLabel: string
  photosHint: string
  submit: string
  update: string
  posted: string
  signInPrompt: string
  signInCta: string
  draftRestored: string
  errors: Record<string, string>
}

/**
 * Review composer.
 *
 * Two behaviours worth knowing about:
 *
 * 1. **Guests can write.** The form is fully usable while signed out; the draft
 *    is kept in localStorage and restored after signing in. Demanding an account
 *    before someone has typed anything is the point at which most people leave,
 *    and losing what they wrote is worse.
 * 2. **Refusals are explained, not hidden.** The database enforces one review per
 *    listing, no reviewing your own business, and five per hour. Each refusal maps
 *    to a sentence rather than a disabled button — which is what the prototype
 *    shipped, permanently disabled and unexplained.
 */
export function ReviewComposer({
  businessId,
  businessSlug,
  locale,
  signedIn,
  existing,
  labels,
}: {
  businessId: string
  businessSlug: string
  locale: string
  signedIn: boolean
  /** Present when the viewer already has a review inside the edit window. */
  existing?: { id: string; rating: number; body: string } | undefined
  labels: ComposerLabels
}) {
  const isEdit = Boolean(existing)
  const [state, formAction] = useActionState(
    isEdit ? editReviewAction : submitReviewAction,
    {} as ActionState,
  )

  const draftKey = `openly:review-draft:${businessSlug}`
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null)
  const [body, setBody] = useState(existing?.body ?? '')
  const [restored, setRestored] = useState(false)

  /*
   * Restore a draft written before signing in.
   *
   * This is the "synchronise with an external system" case the rule carves out:
   * localStorage does not exist during server rendering, so it cannot seed the
   * initial state. Reading it in a `useState` initialiser would render different
   * markup on the server and the client and break hydration; driving the inputs
   * straight from the store would make them uneditable. So: read once after
   * mount, accept the one extra render.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- justified above */
  useEffect(() => {
    if (isEdit) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as { rating?: number; body?: string }
      if (draft.body) setBody(draft.body)
      if (draft.rating) setRating(draft.rating)
      setRestored(true)
    } catch {
      // Corrupt or unavailable storage is not worth surfacing.
    }
  }, [draftKey, isEdit])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist as they type, so a sign-in round trip cannot lose it.
  useEffect(() => {
    if (isEdit) return
    if (!body && rating === null) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({ rating, body }))
    } catch {
      /* storage disabled */
    }
  }, [draftKey, rating, body, isEdit])

  // Clear the draft once it has landed. No setState here: pending is owned by
  // `useFormStatus`, and setting state inside an effect triggers cascading
  // renders that React rightly warns about.
  useEffect(() => {
    if (!state.ok) return
    try {
      localStorage.removeItem(draftKey)
    } catch {
      /* storage disabled */
    }
  }, [state.ok, draftKey])

  if (state.ok) {
    return (
      <p role="status" className="rounded-card bg-success-soft p-4 text-sm text-success">
        {labels.posted}
      </p>
    )
  }

  const formError = state.errors?.['form']
  const tooShort = body.trim().length > 0 && body.trim().length < REVIEW_MIN_LENGTH

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <h3 className="text-lg">{labels.heading}</h3>

      {isEdit ? (
        <input type="hidden" name="reviewId" value={existing?.id} />
      ) : (
        <input type="hidden" name="businessId" value={businessId} />
      )}

      {restored && !isEdit && (
        <p role="status" className="rounded-control bg-accent-soft p-2.5 text-sm text-accent">
          {labels.draftRestored}
        </p>
      )}

      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger/40 bg-danger-soft p-3 text-sm text-danger"
        >
          {labels.errors[formError] ?? labels.errors['failed']}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">{labels.ratingLegend}</span>
        <RatingInput
          value={rating}
          onChange={setRating}
          legend={labels.ratingLegend}
          starLabels={labels.starLabels}
        />
        <input type="hidden" name="rating" value={rating ?? ''} />
        {state.errors?.['rating'] && (
          <p className="text-sm text-danger">
            {labels.errors[state.errors['rating']] ?? labels.errors['failed']}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-body" className="text-sm font-medium text-ink">
          {labels.bodyLabel}
        </label>
        <Textarea
          id="review-body"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={labels.bodyPlaceholder}
          minLength={REVIEW_MIN_LENGTH}
          maxLength={REVIEW_MAX_LENGTH}
          rows={5}
          aria-describedby="review-body-hint"
          aria-invalid={state.errors?.['body'] ? true : undefined}
        />
        <p
          id="review-body-hint"
          className={cn('num text-xs', tooShort ? 'text-warning' : 'text-ink-muted')}
        >
          {interpolate(labels.bodyHint, {
            count: body.trim().length,
            min: REVIEW_MIN_LENGTH,
            max: REVIEW_MAX_LENGTH,
          })}
        </p>
        {state.errors?.['body'] && (
          <p className="text-sm text-danger">
            {labels.errors[state.errors['body']] ?? labels.errors['failed']}
          </p>
        )}
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-photos" className="text-sm font-medium text-ink">
            {labels.photosLabel}
          </label>
          <input
            id="review-photos"
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="text-sm text-ink-muted file:me-3 file:rounded-control file:border-0 file:bg-surface-sunken file:px-3 file:py-1.5 file:text-sm file:text-ink"
            aria-describedby="review-photos-hint"
          />
          <p id="review-photos-hint" className="text-xs text-ink-muted">
            {interpolate(labels.photosHint, { count: REVIEW_MAX_PHOTOS })}
          </p>
          {state.errors?.['photos'] && (
            <p className="text-sm text-danger">
              {labels.errors[state.errors['photos']] ?? labels.errors['failed']}
            </p>
          )}
        </div>
      )}

      {signedIn ? (
        <ComposerSubmit label={isEdit ? labels.update : labels.submit} />
      ) : (
        <div className="flex flex-col gap-2 rounded-control bg-surface-sunken p-3">
          <p className="text-sm text-ink-muted">{labels.signInPrompt}</p>
          <Button asChild className="sm:w-auto sm:self-start">
            {/* The draft is already in localStorage, so it survives the trip. */}
            <Link
              href={`/${locale}/auth/sign-in?next=${encodeURIComponent(
                `/${locale}/business/${businessSlug}#write-review`,
              )}`}
            >
              {labels.signInCta}
            </Link>
          </Button>
        </div>
      )}
    </form>
  )
}

/**
 * Submit button.
 *
 * A separate component because `useFormStatus` only reports the status of the
 * form *above* it in the tree — reading it in the form component itself always
 * returns idle.
 */
function ComposerSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start">
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {label}
    </Button>
  )
}
