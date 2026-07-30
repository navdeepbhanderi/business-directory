'use client'

import { useState, type ReactNode } from 'react'
import { Map as MapIcon, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResultsSyncProvider, HoverDelegate, HoverHighlight } from './results-sync'
import { ResultsMap, type MapPoint } from './results-map'
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
  labels,
}: {
  children: ReactNode
  points: MapPoint[]
  bounds: readonly [number, number, number, number]
  origin: { lat: number; lng: number } | null
  locale: string
  labels: {
    showMap: string
    hideMap: string
    unavailable: string
    searchThisArea: string
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
          {mapOpen ? labels.hideMap : labels.showMap}
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
              locale={locale}
              labels={{ searchThisArea: labels.searchThisArea }}
              onFailure={() => setMapFailed(true)}
            />
          </div>
        )}
      </div>
    </ResultsSyncProvider>
  )
}
