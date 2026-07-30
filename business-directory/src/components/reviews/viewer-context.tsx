'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Viewer-specific review state, fetched after mount.
 *
 * The listing page must stay statically generated — reading the session during
 * its render opts the whole route out of static rendering, which is what turned
 * 200 prerendered pages dynamic twice already. So the page renders the review
 * content from the public client, and this fills in the four answers that depend
 * on who is asking.
 *
 * Everything here is presentational. Each action behind it is enforced by RLS and
 * by triggers, so a tampered response changes what the UI offers and nothing
 * about what the database permits.
 */

export type ReviewViewerState = {
  loaded: boolean
  signedIn: boolean
  canReview: boolean
  reason: string | null
  ownsBusiness: boolean
  ownReview: { id: string; rating: number; body: string; createdAt: string } | null
  votes: string[]
}

export type ReviewViewerContext = ReviewViewerState & {
  /** Re-read the viewer's state after a write, so the two cannot drift. */
  refresh: () => void
}

const EMPTY: ReviewViewerState = {
  loaded: false,
  signedIn: false,
  canReview: false,
  reason: null,
  ownsBusiness: false,
  ownReview: null,
  votes: [],
}

const Ctx = createContext<ReviewViewerContext>({ ...EMPTY, refresh: () => {} })

export function useReviewViewer() {
  return useContext(Ctx)
}

export function ReviewViewerProvider({
  businessId,
  children,
}: {
  businessId: string
  children: ReactNode
}) {
  const [value, setValue] = useState<ReviewViewerState>(EMPTY)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(`/api/review-context?businessId=${businessId}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(String(response.status))
        const data = (await response.json()) as Omit<ReviewViewerState, 'loaded'>
        setValue({ ...data, loaded: true })
      } catch {
        // A failed fetch leaves the signed-out view, which is the safe default:
        // it offers a sign-in prompt rather than controls that would be refused.
        setValue((current) => ({ ...current, loaded: true }))
      }
    }

    void load()
    return () => controller.abort()
  }, [businessId, nonce])

  // Bumping the nonce re-runs the effect above. A vote changes what this endpoint
  // would answer, so without it the button and the database disagree until the
  // next full navigation — which is exactly what the round-trip test caught.
  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  return <Ctx.Provider value={{ ...value, refresh }}>{children}</Ctx.Provider>
}
