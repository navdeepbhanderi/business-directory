'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Listing photo gallery with a lightbox.
 *
 * Keyboard-first: arrows move between photos, Escape closes. The thumbnails are
 * real buttons so tab order is natural, rather than divs with click handlers.
 *
 * Every photo goes through `next/image`. The lead is `priority` with an explicit
 * `fetchPriority="high"`; it is the LCP element on every listing page, and the
 * raw remote JPEG measured a 5.2 s LCP.
 *
 * The thumbnails are optimised and lazy too, which is not merely tidiness: as
 * raw Unsplash JPEGs they were 291 kB fetched eagerly, and on a throttled
 * connection they starved the LCP image of bandwidth even though the LCP image
 * itself was already small.
 */
export function PhotoGallery({
  photos,
  alt,
  labels,
}: {
  photos: { url: string; alt: string | null }[]
  alt: string
  labels: { open: string; close: string; previous: string; next: string; counter: string }
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const move = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? null : (current + delta + photos.length) % photos.length,
      ),
    [photos.length],
  )

  useEffect(() => {
    if (openIndex === null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') move(1)
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openIndex, move, close])

  if (photos.length === 0) return null

  const [lead, ...rest] = photos
  const active = openIndex === null ? null : photos[openIndex]

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        {lead && (
          <button
            type="button"
            onClick={() => setOpenIndex(0)}
            className="group rounded-card border-line bg-surface-sunken relative aspect-[4/3] overflow-hidden border sm:aspect-auto"
            aria-label={labels.open}
          >
            <Image
              src={lead.url}
              alt={lead.alt ?? alt}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 100vw, 60vw"
              className="object-cover transition-transform duration-(--duration-enter) group-hover:scale-[1.02]"
            />
            <span className="rounded-pill bg-surface/90 text-ink absolute end-3 bottom-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium backdrop-blur">
              <Expand className="size-3.5" aria-hidden />
              {labels.open}
            </span>
          </button>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {rest.slice(0, 3).map((photo, index) => (
              <button
                key={photo.url}
                type="button"
                onClick={() => setOpenIndex(index + 1)}
                className="rounded-card border-line bg-surface-sunken relative aspect-[4/3] overflow-hidden border sm:aspect-auto"
                aria-label={`${labels.open} ${index + 2}`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt ?? ''}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 33vw, 20vw"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="bg-ink/90 fixed inset-0 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={close}
        >
          <Image
            src={active.url}
            alt={active.alt ?? alt}
            width={1200}
            height={900}
            sizes="90vw"
            className="rounded-card max-h-[80dvh] w-auto object-contain"
            onClick={(event) => event.stopPropagation()}
          />

          <div
            className="mt-4 flex items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={labels.previous}
              className="rounded-control bg-surface text-ink hover:bg-surface-sunken p-2 transition-colors duration-(--duration-hover)"
            >
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </button>
            <span className="num text-paper text-sm">
              {openIndex !== null ? openIndex + 1 : 0} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={labels.next}
              className="rounded-control bg-surface text-ink hover:bg-surface-sunken p-2 transition-colors duration-(--duration-hover)"
            >
              <ChevronRight className="size-5 rtl:rotate-180" />
            </button>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label={labels.close}
            className={cn(
              'rounded-control bg-surface text-ink absolute end-4 top-4 p-2',
              'hover:bg-surface-sunken transition-colors duration-(--duration-hover)',
            )}
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </>
  )
}
