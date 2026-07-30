'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { mapColors } from '@/lib/brand'
import { useResultsHover } from './results-sync'

/**
 * Clustered results map.
 *
 * MapLibre with a keyless CARTO raster basemap — no API key, no billing account,
 * and nothing to leak. Mapbox remains a drop-in swap if vector styling and
 * localised labels become worth the key.
 *
 * The library is ~800 kB, so it is imported dynamically inside an effect rather
 * than at module scope: a visitor who never opens the map never downloads it.
 * If the import fails, the caller shows a plain notice and the list still works.
 */

export type MapPoint = {
  id: string
  slug: string
  name: string
  latitude: number
  longitude: number
  rating: number
  isOpen: boolean
}

const BASEMAP_LIGHT = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const BASEMAP_DARK = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

function toFeatureCollection(points: MapPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      id: point.id,
      geometry: { type: 'Point' as const, coordinates: [point.longitude, point.latitude] },
      properties: {
        id: point.id,
        slug: point.slug,
        name: point.name,
        rating: point.rating,
        isOpen: point.isOpen ? 1 : 0,
      },
    })),
  }
}

export function ResultsMap({
  points,
  bounds,
  origin,
  labels,
  onFailure,
  renderPopover,
}: {
  points: MapPoint[]
  /** Market bounds, used when there are no results to frame. */
  bounds: readonly [number, number, number, number]
  origin: { lat: number; lng: number } | null
  labels: { searchThisArea: string; close: string }
  onFailure: () => void
  /**
   * Contents of the popover for a selected pin. Passed in rather than built here
   * so the map does not have to know about favourites, and so this stays the only
   * file that touches MapLibre.
   */
  renderPopover?: (point: MapPoint) => ReactNode
}) {
  const container = useRef<HTMLDivElement | null>(null)
  const map = useRef<MapLibreMap | null>(null)
  // Narrowed once at creation. `getSource()` returns a union of every source
  // type, and narrowing it at each use site needs the runtime class, which only
  // exists inside the dynamic import's scope.
  const source = useRef<GeoJSONSource | null>(null)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { hoveredId, setHoveredId } = useResultsHover()

  // Initialise once. Point data is pushed in through a separate effect so a
  // filter change never tears down and rebuilds the map.
  useEffect(() => {
    let cancelled = false
    const node = container.current
    if (!node) return

    async function init() {
      try {
        const maplibre = await import('maplibre-gl')
        if (cancelled || !node) return

        const dark = document.documentElement.classList.contains('dark')
        const instance = new maplibre.Map({
          container: node,
          style: {
            version: 8,
            sources: {
              basemap: {
                type: 'raster',
                tiles: [dark ? BASEMAP_DARK : BASEMAP_LIGHT],
                tileSize: 256,
                attribution: ATTRIBUTION,
              },
            },
            layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
          },
          bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
          fitBoundsOptions: { padding: 40 },
          attributionControl: { compact: true },
        })

        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')
        instance.on('load', () => {
          if (cancelled) return
          instance.addSource('results', {
            type: 'geojson',
            data: toFeatureCollection([]),
            cluster: true,
            clusterRadius: 46,
            clusterMaxZoom: 13,
          })

          const created = instance.getSource('results')
          source.current = created instanceof maplibre.GeoJSONSource ? created : null

          instance.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'results',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'case',
                ['>', ['get', 'point_count'], 9],
                mapColors.clusterLarge,
                mapColors.cluster,
              ],
              'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
              'circle-stroke-width': 2,
              'circle-stroke-color': mapColors.outline,
            },
          })
          instance.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'results',
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
            paint: { 'text-color': mapColors.clusterText },
          })
          instance.addLayer({
            id: 'pins',
            type: 'circle',
            source: 'results',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': [
                'case',
                ['==', ['get', 'isOpen'], 1],
                mapColors.pinOpen,
                mapColors.pinClosed,
              ],
              // The hovered pin grows, mirroring the highlighted card in the list.
              'circle-radius': ['case', ['boolean', ['feature-state', 'hovered'], false], 12, 8],
              'circle-stroke-width': 2,
              'circle-stroke-color': mapColors.outline,
            },
          })

          // Clicking a cluster zooms into it rather than doing nothing.
          instance.on('click', 'clusters', (event) => {
            const feature = instance.queryRenderedFeatures(event.point, { layers: ['clusters'] })[0]
            if (!feature) return
            const clusterId = feature.properties?.['cluster_id'] as number | undefined
            if (!source.current || clusterId === undefined) return
            void source.current.getClusterExpansionZoom(clusterId).then((zoom) => {
              const geometry = feature.geometry
              if (geometry.type !== 'Point') return
              instance.easeTo({
                center: [geometry.coordinates[0] ?? 0, geometry.coordinates[1] ?? 0],
                zoom,
              })
            })
          })

          /*
           * A pin opens a popover rather than navigating. Navigating on click made
           * the map a slower way to do what the list already does; the point of a
           * map is to compare places before committing to one — which means being
           * able to save a listing without leaving the map.
           */
          instance.on('click', 'pins', (event) => {
            const id = event.features?.[0]?.properties?.['id'] as string | undefined
            setSelectedId(id ?? null)
          })

          // Clicking the basemap dismisses it. Registered after the pin handler,
          // and guarded by a hit test, so the two do not fight.
          instance.on('click', (event) => {
            const hits = instance.queryRenderedFeatures(event.point, { layers: ['pins'] })
            if (hits.length === 0) setSelectedId(null)
          })

          for (const layer of ['clusters', 'pins']) {
            instance.on('mouseenter', layer, () => {
              instance.getCanvas().style.cursor = 'pointer'
            })
            instance.on('mouseleave', layer, () => {
              instance.getCanvas().style.cursor = ''
            })
          }

          instance.on('mousemove', 'pins', (event) => {
            const id = event.features?.[0]?.properties?.['id'] as string | undefined
            setHoveredId(id ?? null)
          })
          instance.on('mouseleave', 'pins', () => setHoveredId(null))

          map.current = instance
          setReady(true)
        })

        instance.on('error', () => onFailure())
      } catch {
        if (!cancelled) onFailure()
      }
    }

    void init()

    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      source.current = null
    }
    // Intentionally mount-only: bounds/locale changes must not rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push point data and reframe when results change.
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return

    source.current?.setData(toFeatureCollection(points))

    if (points.length === 0) return
    let west = 180
    let south = 90
    let east = -180
    let north = -90
    for (const point of points) {
      west = Math.min(west, point.longitude)
      east = Math.max(east, point.longitude)
      south = Math.min(south, point.latitude)
      north = Math.max(north, point.latitude)
    }
    if (origin) {
      west = Math.min(west, origin.lng)
      east = Math.max(east, origin.lng)
      south = Math.min(south, origin.lat)
      north = Math.max(north, origin.lat)
    }
    instance.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 56, maxZoom: 15, duration: 400 },
    )
  }, [points, origin, ready])

  // Mirror the list's hover onto the map.
  const previousHover = useRef<string | null>(null)
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return

    if (previousHover.current) {
      instance.setFeatureState({ source: 'results', id: previousHover.current }, { hovered: false })
    }
    if (hoveredId) {
      instance.setFeatureState({ source: 'results', id: hoveredId }, { hovered: true })
    }
    previousHover.current = hoveredId
  }, [hoveredId, ready])

  /*
   * Derived, not synchronised. A filter change can remove the selected listing,
   * and the obvious fix — an effect that clears `selectedId` when `points`
   * changes — is a cascading render for something a lookup already handles: if the
   * pin is gone, this is null and no popover renders. The stale id costs nothing.
   */
  const selected = selectedId ? (points.find((point) => point.id === selectedId) ?? null) : null

  return (
    <div className="relative size-full">
      <div ref={container} className="size-full" aria-hidden />
      {/* The map is decorative duplication of the list, which remains the
          accessible source of truth — so it is hidden from assistive tech
          rather than given a role it cannot honour. */}
      <span className="sr-only">{labels.searchThisArea}</span>

      {/*
        Anchored to the bottom of the map rather than to the pin's screen
        position. A tethered popover has to be re-projected on every pan and zoom
        and still gets clipped at the edges; this cannot be clipped, does not move
        under the cursor, and matches what people are used to on a phone.
      */}
      {selected && renderPopover && (
        <div className="absolute inset-x-3 bottom-3 z-10">
          <div className="rounded-card border-line bg-surface shadow-card border p-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label={labels.close}
              className="text-ink-muted hover:text-ink absolute end-4 top-3 text-lg leading-none"
            >
              ×
            </button>
            {renderPopover(selected)}
          </div>
        </div>
      )}
    </div>
  )
}
