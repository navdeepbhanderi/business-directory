'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toggleFavoriteAction } from '@/lib/actions/saved'
import { cn } from '@/lib/utils'
import { useSaved } from './saved-store'

export type FavoriteLabels = {
  save: string
  saved: string
  signIn: string
  errors: Record<string, string>
}

/**
 * Save a listing.
 *
 * Appears on every card, in map popovers, and on the listing page, and all of
 * them read one context — so pressing any of them updates the rest without
 * anything being pushed between components.
 *
 * Signed out, it is a link to sign-in carrying a return path rather than a button
 * that fails. The prototype's version was a heart that toggled colour and stored
 * nothing, which is worse than not offering it.
 */
export function FavoriteButton({
  businessId,
  businessName,
  locale,
  returnTo,
  variant = 'icon',
  labels,
  className,
}: {
  businessId: string
  businessName: string
  locale: string
  /**
   * Path to come back to after signing in. Defaults to the current path — pass it
   * explicitly where the query string matters, such as a filtered search.
   * `useSearchParams` would be the obvious way to include it automatically, but
   * it forces a Suspense boundary on every statically rendered page that holds a
   * card, which is most of them.
   */
  returnTo?: string
  variant?: 'icon' | 'labelled'
  labels: FavoriteLabels
  className?: string
}) {
  const saved = useSaved()
  const pathname = usePathname()
  const [error, setError] = useState<string | null>(null)
  const active = saved.isFavorite(businessId)
  const target = returnTo ?? pathname

  // While the state is still loading, and for a signed-out visitor, this is a
  // link. Rendering a button that cannot work is the prototype's mistake.
  if (saved.loaded && !saved.signedIn) {
    return (
      <Link
        href={`/${locale}/auth/sign-in?next=${encodeURIComponent(target)}`}
        aria-label={`${labels.signIn}: ${businessName}`}
        className={cn(shellClasses(variant, false), className)}
      >
        <Heart className="size-4" aria-hidden />
        {variant === 'labelled' && <span>{labels.save}</span>}
      </Link>
    )
  }

  return (
    <form
      action={async (formData: FormData) => {
        setError(null)
        const next = !active
        saved.setFavorite(businessId, next)

        const result = await toggleFavoriteAction({}, formData)
        if (result.errors?.['form']) {
          // Put it back: a heart that stays filled after a refusal claims
          // something the database never accepted.
          saved.setFavorite(businessId, !next)
          setError(result.errors['form'])
          return
        }
        // Trust what came back rather than what was assumed: a toggle that raced
        // another tab could have gone the other way.
        saved.setFavorite(businessId, result.message === 'added')
      }}
      className={variant === 'labelled' ? 'contents' : undefined}
    >
      <input type="hidden" name="businessId" value={businessId} />
      {/*
        The accessible name does not change with the state — `aria-pressed` carries
        it. Renaming a toggle *and* marking it pressed announces the change twice
        ("Saved: X, pressed"), and it also means the control someone is holding
        stops being the control they were addressing the moment they press it,
        which is how the end-to-end test came to click a button that then no longer
        existed under that name.
      */}
      <button
        type="submit"
        aria-pressed={active}
        aria-label={`${labels.save}: ${businessName}`}
        title={active ? labels.saved : labels.save}
        className={cn(shellClasses(variant, active), className)}
      >
        <Heart className={cn('size-4', active && 'fill-current')} aria-hidden />
        {variant === 'labelled' && <span>{active ? labels.saved : labels.save}</span>}
      </button>
      {error && (
        <span role="alert" className="text-danger ms-2 text-xs">
          {labels.errors[error] ?? labels.errors['failed']}
        </span>
      )}
    </form>
  )
}

function shellClasses(variant: 'icon' | 'labelled', active: boolean): string {
  if (variant === 'labelled') {
    return cn(
      'inline-flex items-center justify-center gap-2 rounded-pill border px-4 py-2 text-sm font-medium',
      'transition-colors duration-(--duration-hover)',
      active
        ? 'border-accent bg-accent-soft text-accent'
        : 'border-line-strong text-ink hover:border-ink-muted',
    )
  }

  /*
   * `z-10` is not decoration. The whole card is a stretched link — an ::after
   * pseudo-element covering it — so without raising this above that layer the
   * click lands on the link and navigates instead of saving.
   */
  return cn(
    'relative z-10 inline-flex size-9 items-center justify-center rounded-pill backdrop-blur',
    'transition-colors duration-(--duration-hover)',
    active
      ? 'bg-surface/90 text-accent'
      : 'bg-surface/80 text-ink-muted hover:bg-surface hover:text-ink',
  )
}
