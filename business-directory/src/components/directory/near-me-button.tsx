'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LocateFixed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { searchHref, withChange, type SearchState } from '@/lib/search-params'
import type { Locale } from '@/i18n/config'

/**
 * Puts the visitor's coordinates into the URL.
 *
 * Geolocation is the one piece of search state that cannot come from a link, so
 * this is the only genuinely interactive control in the filter surface. Once the
 * coordinates are in the URL everything downstream — radius, `nearest` sort,
 * distance labels — is server-rendered like every other facet.
 *
 * A denied or unavailable position is reported in place rather than silently
 * doing nothing, and never blocks the rest of the page.
 */
export function NearMeButton({
  state,
  locale,
  labels,
  defaultRadiusKm = 5,
}: {
  state: SearchState
  locale: Locale
  labels: { nearMe: string; locating: string; denied: string }
  defaultRadiusKm?: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [locating, setLocating] = useState(false)
  const [denied, setDenied] = useState(false)

  const active = state.lat !== null

  function locate() {
    if (active) {
      startTransition(() => {
        router.push(searchHref(locale, withChange(state, { lat: null, lng: null })))
      })
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDenied(true)
      return
    }

    setDenied(false)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        startTransition(() => {
          router.push(
            searchHref(
              locale,
              withChange(state, {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                radiusKm: state.radiusKm ?? defaultRadiusKm,
                sort: 'nearest',
              }),
            ),
          )
        })
      },
      () => {
        setLocating(false)
        setDenied(true)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    )
  }

  const busy = locating || pending

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={active ? 'primary' : 'outline'}
        onClick={locate}
        disabled={busy}
        aria-pressed={active}
      >
        <LocateFixed className={busy ? 'animate-pulse' : undefined} />
        {busy ? labels.locating : labels.nearMe}
      </Button>
      {denied && (
        <p role="status" className="text-warning text-xs">
          {labels.denied}
        </p>
      )}
    </div>
  )
}
