'use client'

import { useState, type ReactNode } from 'react'
import { Map as MapIcon, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResultsSyncProvider, HoverDelegate, HoverHighlight } from './results-sync'
import { ResultsMap, type MapPoint } from './results-map'
import { MapPopoverCard } from '@/components/saved/map-popover-card'
import type { FavoriteLabels } from '@/components/saved/favorite-button'
import { cn } from '@/lib/utils'

/**
 * Wraps the (server-rendered) results grid and the map, and owns the two bits
 * of state that are genuinely client-side: whether the map is shown on small
 * screens, and whether it failed to load.
 *
 * The grid arrives as `children` already rendered on the server, so opening the
 * map costs the MapLibre bundle and nothing else — the results themselves are
 * not re-rendered or re-fetched.
 */
export function ResultsView({
  children,
  points,
  bounds,
  origin,
  locale,
  returnTo,
  labels,
}: {
  children: ReactNode
  points: MapPoint[]
  bounds: readonly [number, number, number, number]
  origin: { lat: number; lng: number } | null
  locale: string
  /** Where a sign-in prompt should send the visitor back to, query string included. */
  returnTo: string
  labels: {
    showMap: string
    showList: string
    unavailable: string
    searchThisArea: string
    closePopover: string
    viewListing: string
    openNow: string
    closed: string
    favorite: FavoriteLabels
  }
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)

  const showMap = mapOpen && !mapFailed

  return (
    <ResultsSyncProvider>
      <HoverHighlight />

      <div className="mb-4 flex justify-end lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setMapOpen((open) => !open)}>
          {mapOpen ? <List /> : <MapIcon />}
          {/* The map replaces the list on small screens, so the toggle names the
              thing it will bring back — it previously read "Hide list" while the
              list was already hidden. */}
          {mapOpen ? labels.showList : labels.showMap}
        </Button>
      </div>

      {mapFailed && (
        <p
          role="status"
          className="rounded-card border-line bg-warning-soft text-warning mb-4 border p-3 text-sm"
        >
          {labels.unavailable}
        </p>
      )}

      <div className={cn('gap-6', showMap ? 'grid' : 'grid lg:grid-cols-[1fr_24rem]')}>
        {/* On mobile the map replaces the list; on desktop they sit side by side. */}
        <HoverDelegate className={cn(showMap && 'hidden lg:block')}>{children}</HoverDelegate>

        {!mapFailed && points.length > 0 && (
          <div
            className={cn(
              'rounded-card border-line bg-surface-sunken overflow-hidden border',
              showMap ? 'h-[70dvh]' : 'hidden h-[70dvh] lg:sticky lg:top-20 lg:block',
            )}
          >
            <ResultsMap
              points={points}
              bounds={bounds}
              origin={origin}
              labels={{
                searchThisArea: labels.searchThisArea,
                close: labels.closePopover,
              }}
              onFailure={() => setMapFailed(true)}
              renderPopover={(point) => (
                <MapPopoverCard
                  point={point}
                  locale={locale}
                  returnTo={returnTo}
                  labels={{
                    viewListing: labels.viewListing,
                    openNow: labels.openNow,
                    closed: labels.closed,
                    favorite: labels.favorite,
                  }}
                />
              )}
            />
          </div>
        )}
      </div>
    </ResultsSyncProvider>
  )
}
