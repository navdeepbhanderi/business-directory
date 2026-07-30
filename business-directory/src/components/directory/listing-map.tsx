'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { mapColors } from '@/lib/brand'

/**
 * Single-marker map for one listing.
 *
 * Separate from `ResultsMap` on purpose: this one has no clustering, no hover
 * sync, and no source updates, so sharing an abstraction between them would mean
 * a component that does neither job cleanly.
 *
 * Loads only when scrolled into view. On a listing page the map is below the
 * fold, and it is the single heaviest asset on the route — downloading it for
 * someone who only wanted the phone number is waste.
 */
export function ListingMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number
  longitude: number
  name: string
}) {
  const container = useRef<HTMLDivElement | null>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const node = container.current
    if (!node || visible) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
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
                tiles: [
                  dark
                    ? 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
                    : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                ],
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
              },
            },
            layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
          },
          center: [longitude, latitude],
          zoom: 15,
          attributionControl: { compact: true },
        })

        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')

        const marker = document.createElement('div')
        marker.style.width = '18px'
        marker.style.height = '18px'
        marker.style.borderRadius = '999px'
        marker.style.background = mapColors.pinOpen
        marker.style.border = `3px solid ${mapColors.outline}`
        marker.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)'
        marker.setAttribute('aria-hidden', 'true')

        new maplibre.Marker({ element: marker }).setLngLat([longitude, latitude]).addTo(instance)
        instance.on('error', () => setFailed(true))
        map.current = instance
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void init()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [visible, latitude, longitude])

  return (
    <div
      ref={container}
      className="rounded-card border-line bg-surface-sunken h-56 w-full overflow-hidden border"
      role="img"
      aria-label={failed ? '' : name}
    />
  )
}
