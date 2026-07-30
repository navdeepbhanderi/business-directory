'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Shares one piece of state — the hovered listing — between the results list
 * and the map.
 *
 * Deliberately narrow. The list itself stays server-rendered: the provider
 * catches pointer events by delegation on the grid container and reads
 * `data-business-id` off the nearest card, so `BusinessCard` never has to become
 * a client component just to support a hover highlight.
 */

type ResultsHoverValue = {
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}

const ResultsHoverContext = createContext<ResultsHoverValue>({
  hoveredId: null,
  setHoveredId: () => {},
})

export function useResultsHover() {
  return useContext(ResultsHoverContext)
}

export function ResultsSyncProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const value = useMemo(() => ({ hoveredId, setHoveredId }), [hoveredId])

  return <ResultsHoverContext.Provider value={value}>{children}</ResultsHoverContext.Provider>
}

/**
 * Wraps the results grid and reports hover by delegation.
 *
 * `pointerover` rather than `mouseenter` so it bubbles, and a single listener
 * covers every card regardless of how many there are.
 */
export function HoverDelegate({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { hoveredId, setHoveredId } = useResultsHover()

  return (
    <div
      className={className}
      data-hovered={hoveredId ?? undefined}
      onPointerOver={(event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>('[data-business-id]')
        setHoveredId(card?.dataset['businessId'] ?? null)
      }}
      onPointerLeave={() => setHoveredId(null)}
      // Keyboard users get the same highlight when focus lands inside a card.
      onFocus={(event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>('[data-business-id]')
        setHoveredId(card?.dataset['businessId'] ?? null)
      }}
    >
      {children}
    </div>
  )
}

/**
 * Highlights whichever card the *map* is hovering.
 *
 * Emits a one-rule stylesheet targeting the hovered card's id. This keeps
 * `BusinessCard` a Server Component — the alternative was making every card
 * client-side and subscribing each one to context, which is a lot of JavaScript
 * for a hover ring.
 *
 * The id is filtered to `[\w-]` before interpolation. It originates from our own
 * `data-business-id` attributes, but building a stylesheet from a value that
 * reached the client is exactly where not to trust provenance.
 */
export function HoverHighlight() {
  const { hoveredId } = useResultsHover()
  if (!hoveredId) return null

  const safeId = hoveredId.replace(/[^\w-]/g, '')
  if (!safeId) return null

  return (
    <style>{`[data-business-id="${safeId}"]{box-shadow:0 0 0 2px var(--accent);border-color:var(--accent)}`}</style>
  )
}
