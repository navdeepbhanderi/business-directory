'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { vendorColors } from '@/lib/brand'
import type { Locale } from '@/i18n/config'

/**
 * Google sign-in.
 *
 * Runs in the browser because the OAuth handshake needs a real redirect the user
 * can see and consent to. The provider returns to `/auth/callback`, which
 * exchanges the code for a session server-side.
 *
 * NOTE: needs `[auth.external.google]` credentials in supabase/config.toml. With
 * none configured this reports the failure rather than hanging — a dead button
 * would be worse than an honest error.
 */
export function GoogleButton({
  locale,
  label,
  next,
  errorLabel,
}: {
  locale: Locale
  label: string
  next?: string
  errorLabel: string
}) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function start() {
    setPending(true)
    setFailed(false)
    try {
      const supabase = createSupabaseBrowserClient()
      const redirectTo = new URL(`/${locale}/auth/callback`, window.location.origin)
      if (next) redirectTo.searchParams.set('next', next)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo.toString() },
      })
      if (error) throw error
    } catch {
      setPending(false)
      setFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" className="w-full" onClick={start} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleGlyph />}
        {label}
      </Button>
      {failed && (
        <p role="alert" className="text-danger text-sm">
          {errorLabel}
        </p>
      )}
    </div>
  )
}

/** Google's mark, inlined: an icon font or remote SVG for one glyph is waste. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path
        fill={vendorColors.googleBlue}
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z"
      />
      <path
        fill={vendorColors.googleGreen}
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86a5.36 5.36 0 0 1-5.03-3.71H1.05v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill={vendorColors.googleYellow}
        d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H1.05a9 9 0 0 0 0 8.1l2.92-2.34Z"
      />
      <path
        fill={vendorColors.googleRed}
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 1.05 4.95l2.92 2.34A5.36 5.36 0 0 1 9 3.58Z"
      />
    </svg>
  )
}
