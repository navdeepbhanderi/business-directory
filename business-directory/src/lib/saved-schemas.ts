import { z } from 'zod'

/**
 * Validation for favourites, lists, and saved searches.
 *
 * Every limit here matches a constraint in the schema — list names are 1–80
 * characters in both places, deliberately. Two rules that can drift is worse than
 * one rule enforced twice, so the numbers live in one exported constant each.
 */

export const LIST_NAME_MAX = 80
export const LIST_DESCRIPTION_MAX = 500
export const LIST_NOTE_MAX = 280
export const SAVED_SEARCH_NAME_MAX = 80

export const LIST_VISIBILITIES = ['private', 'unlisted', 'public'] as const
export type ListVisibility = (typeof LIST_VISIBILITIES)[number]

/** Whether this visibility is reachable by a link. Drives the share UI. */
export function isShared(visibility: ListVisibility): boolean {
  return visibility !== 'private'
}

const uuid = z.string().uuid('invalid')

const listName = z
  .string()
  .trim()
  .min(1, 'required')
  .max(LIST_NAME_MAX, 'too-long')

export const listCreateSchema = z.object({
  name: listName,
  description: z.string().trim().max(LIST_DESCRIPTION_MAX, 'too-long').optional(),
  visibility: z.enum(LIST_VISIBILITIES).default('private'),
})

export const listUpdateSchema = z.object({
  listId: uuid,
  name: listName,
  description: z.string().trim().max(LIST_DESCRIPTION_MAX, 'too-long').optional(),
  visibility: z.enum(LIST_VISIBILITIES),
})

export const favoriteSchema = z.object({
  businessId: uuid,
})

export const listItemSchema = z.object({
  listId: uuid,
  businessId: uuid,
  // An empty note means "no note", not an invalid note: clearing one is a normal
  // thing to want to do.
  note: z.string().trim().max(LIST_NOTE_MAX, 'too-long').optional(),
})

export const reorderSchema = z.object({
  listId: uuid,
  businessIds: z.array(uuid).min(1, 'required').max(200, 'too-long'),
})

export const savedSearchSchema = z.object({
  name: z.string().trim().min(1, 'required').max(SAVED_SEARCH_NAME_MAX, 'too-long'),
  /** The canonical query string, without the leading `?`. */
  query: z.string().max(2000, 'too-long'),
  notify: z.boolean().default(false),
})

/**
 * A name for a search the person did not name themselves.
 *
 * Offering "Untitled search" for every one of them makes the list useless, so the
 * default is built from what they actually searched for.
 */
export function describeSearch(
  query: string,
  labels: { anywhere: string; openNow: string; near: string },
): string {
  const params = new URLSearchParams(query)
  const parts: string[] = []

  const q = params.get('q')?.trim()
  if (q) parts.push(q)

  const city = params.get('city')
  if (city) parts.push(city.replace(/-/g, ' '))
  else if (!q) parts.push(labels.anywhere)

  if (params.get('open') === 'true') parts.push(labels.openNow)
  if (params.has('lat') && params.has('lng')) parts.push(labels.near)

  return parts.join(' · ')
}
