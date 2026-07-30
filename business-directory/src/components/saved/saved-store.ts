'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { ListVisibility } from '@/lib/saved-schemas'

/**
 * What the viewer has saved, held in a module-level store rather than a React
 * context.
 *
 * The exit criterion for this phase is that a favourite toggled on a search card,
 * a map popover, and a listing page agree with each other. Context was the
 * obvious way to do that and it did not hold: on the search page the results are
 * streamed inside a Suspense boundary and rendered as `children` of a Client
 * Component, and cards there kept the state they hydrated with — if the fetch
 * landed after they hydrated, every heart stayed empty even though the provider
 * had the answer. It reproduced on that page only, and intermittently, which is
 * the worst kind of "works on my machine".
 *
 * `useSyncExternalStore` removes the question. Every subscriber re-renders when
 * the snapshot changes, whatever its position in the tree and whichever bundle it
 * arrived in — the guarantee context could not give here. It also survives
 * client-side navigation, so moving between pages does not re-fetch.
 *
 * None of this is a security boundary. RLS decides what may actually be written;
 * this decides which heart looks filled.
 */

export type SavedList = {
  id: string
  name: string
  visibility: ListVisibility
  shareSlug: string | null
  businessIds: string[]
}

export type SavedState = {
  loaded: boolean
  signedIn: boolean
  favorites: string[]
  lists: SavedList[]
}

export type SavedPatch =
  | { kind: 'favorite'; businessId: string; next: boolean }
  | { kind: 'list'; listId: string; businessId: string; next: boolean }

const EMPTY: SavedState = { loaded: false, signedIn: false, favorites: [], lists: [] }

let snapshot: SavedState = EMPTY
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

/**
 * The server always renders the empty state.
 *
 * It must be one stable object: returning a fresh one each call makes React
 * re-render forever.
 */
function getServerSnapshot() {
  return EMPTY
}

export function applyPatch(state: SavedState, patch: SavedPatch): SavedState {
  if (patch.kind === 'favorite') {
    const without = state.favorites.filter((id) => id !== patch.businessId)
    return { ...state, favorites: patch.next ? [...without, patch.businessId] : without }
  }

  return {
    ...state,
    lists: state.lists.map((list) => {
      if (list.id !== patch.listId) return list
      const without = list.businessIds.filter((id) => id !== patch.businessId)
      return { ...list, businessIds: patch.next ? [...without, patch.businessId] : without }
    }),
  }
}

export function patchSaved(patch: SavedPatch) {
  snapshot = applyPatch(snapshot, patch)
  emit()
}

export function addListLocally(list: SavedList) {
  snapshot = { ...snapshot, lists: [list, ...snapshot.lists] }
  emit()
}

let inFlight: Promise<void> | null = null

/**
 * Read the viewer's saved state.
 *
 * Concurrent callers share one request: every card on the page mounts at once and
 * would otherwise each ask.
 */
export function loadSaved(force = false): Promise<void> {
  if (inFlight && !force) return inFlight

  inFlight = (async () => {
    try {
      const response = await fetch('/api/saved')
      if (!response.ok) throw new Error(String(response.status))
      const data = (await response.json()) as Omit<SavedState, 'loaded'>
      snapshot = { ...data, loaded: true }
    } catch {
      // Signed out is the safe default: it offers a sign-in prompt rather than
      // controls whose writes the database would refuse anyway.
      snapshot = { ...snapshot, loaded: true }
    } finally {
      inFlight = null
      emit()
    }
  })()

  return inFlight
}

export type SavedApi = SavedState & {
  isFavorite: (businessId: string) => boolean
  /** Lists that already contain this listing, for the add-to-list menu. */
  listsContaining: (businessId: string) => string[]
  setFavorite: (businessId: string, next: boolean) => void
  setInList: (listId: string, businessId: string, next: boolean) => void
  addList: (list: SavedList) => void
  refresh: () => void
}

export function useSaved(): SavedApi {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const refresh = useCallback(() => {
    void loadSaved(true)
  }, [])

  return useMemo(
    () => ({
      ...state,
      isFavorite: (businessId: string) => state.favorites.includes(businessId),
      listsContaining: (businessId: string) =>
        state.lists.filter((list) => list.businessIds.includes(businessId)).map((list) => list.id),
      setFavorite: (businessId: string, next: boolean) =>
        patchSaved({ kind: 'favorite', businessId, next }),
      setInList: (listId: string, businessId: string, next: boolean) =>
        patchSaved({ kind: 'list', listId, businessId, next }),
      addList: addListLocally,
      refresh,
    }),
    [state, refresh],
  )
}
