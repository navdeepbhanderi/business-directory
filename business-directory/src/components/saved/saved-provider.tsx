'use client'

import { useEffect, type ReactNode } from 'react'
import { loadSaved } from './saved-store'

/**
 * Loads the viewer's saved state once per page load.
 *
 * Not a context provider despite the name it kept: the state lives in a module
 * store (see `saved-store.ts` for why), so this only has to start the request.
 * It sits in the site layout, above every page that shows a card.
 *
 * The request is deliberately made after mount rather than during render —
 * reading the session while rendering opts a route out of static generation, and
 * most of the pages holding cards are statically generated.
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void loadSaved()
  }, [])

  return <>{children}</>
}
