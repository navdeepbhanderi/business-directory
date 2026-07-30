import { describe, expect, it } from 'vitest'
import {
  LIST_NAME_MAX,
  describeSearch,
  favoriteSchema,
  isShared,
  listCreateSchema,
  listItemSchema,
  listUpdateSchema,
  reorderSchema,
  savedSearchSchema,
} from './saved-schemas'
import { toFieldErrors } from './auth-schemas'

describe('listCreateSchema', () => {
  it('trims the name and defaults to private', () => {
    const parsed = listCreateSchema.parse({ name: '  Weekend food crawl  ' })
    expect(parsed.name).toBe('Weekend food crawl')
    // A list must not become shareable by accident: the default is the private one.
    expect(parsed.visibility).toBe('private')
  })

  it('rejects an empty or whitespace-only name', () => {
    for (const name of ['', '   ', '\n']) {
      expect(listCreateSchema.safeParse({ name }).success, JSON.stringify(name)).toBe(false)
    }
  })

  it('enforces the same length limit as the database constraint', () => {
    expect(listCreateSchema.safeParse({ name: 'a'.repeat(LIST_NAME_MAX) }).success).toBe(true)
    expect(listCreateSchema.safeParse({ name: 'a'.repeat(LIST_NAME_MAX + 1) }).success).toBe(false)
  })

  it('rejects a visibility outside the enum rather than coercing it', () => {
    expect(listCreateSchema.safeParse({ name: 'A list', visibility: 'everyone' }).success).toBe(
      false,
    )
  })

  it('reports the offending field, so the form can point at it', () => {
    const result = listCreateSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(toFieldErrors(result.error)).toEqual({ name: 'required' })
  })
})

describe('listUpdateSchema', () => {
  it('requires a real list id', () => {
    expect(
      listUpdateSchema.safeParse({ listId: 'not-a-uuid', name: 'A', visibility: 'private' }).success,
    ).toBe(false)
  })

  it('requires visibility explicitly — an update must not silently reset it', () => {
    expect(
      listUpdateSchema.safeParse({
        listId: '11111111-1111-4111-8111-111111111111',
        name: 'A list',
      }).success,
    ).toBe(false)
  })
})

describe('isShared', () => {
  it('treats anything but private as reachable by link', () => {
    expect(isShared('private')).toBe(false)
    expect(isShared('unlisted')).toBe(true)
    expect(isShared('public')).toBe(true)
  })
})

describe('favoriteSchema and listItemSchema', () => {
  it('reject anything that is not a uuid', () => {
    expect(favoriteSchema.safeParse({ businessId: '../../etc/passwd' }).success).toBe(false)
    expect(
      listItemSchema.safeParse({ listId: 'x', businessId: 'y', note: 'note' }).success,
    ).toBe(false)
  })

  it('treats a missing note as "no note" rather than invalid', () => {
    const parsed = listItemSchema.parse({
      listId: '11111111-1111-4111-8111-111111111111',
      businessId: '22222222-2222-4222-8222-222222222222',
    })
    expect(parsed.note).toBeUndefined()
  })
})

describe('reorderSchema', () => {
  it('accepts a list of ids', () => {
    const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
    expect(
      reorderSchema.parse({ listId: '33333333-3333-4333-8333-333333333333', businessIds: ids })
        .businessIds,
    ).toEqual(ids)
  })

  it('rejects an empty order and a single bad id', () => {
    const listId = '33333333-3333-4333-8333-333333333333'
    expect(reorderSchema.safeParse({ listId, businessIds: [] }).success).toBe(false)
    expect(
      reorderSchema.safeParse({
        listId,
        businessIds: ['11111111-1111-4111-8111-111111111111', 'nope'],
      }).success,
    ).toBe(false)
  })
})

describe('savedSearchSchema', () => {
  it('defaults notify to off', () => {
    expect(savedSearchSchema.parse({ name: 'Bakeries', query: 'q=bakery' }).notify).toBe(false)
  })

  it('accepts an empty query — "everything, sorted this way" is a real search', () => {
    expect(savedSearchSchema.safeParse({ name: 'Everything', query: '' }).success).toBe(true)
  })
})

describe('describeSearch', () => {
  const labels = { anywhere: 'Everywhere', openNow: 'open now', near: 'near me' }

  it('builds a name from what was actually searched for', () => {
    expect(describeSearch('q=bakery&city=mumbai&open=true', labels)).toBe(
      'bakery · mumbai · open now',
    )
  })

  it('reads a multi-word city slug as words', () => {
    expect(describeSearch('city=navi-mumbai', labels)).toBe('navi mumbai')
  })

  it('says "everywhere" only when there is nothing else to say', () => {
    expect(describeSearch('', labels)).toBe('Everywhere')
    expect(describeSearch('q=dentist', labels)).toBe('dentist')
  })

  it('mentions a location search', () => {
    expect(describeSearch('lat=19.07&lng=72.87', labels)).toBe('Everywhere · near me')
  })

  it('ignores a half-given coordinate, matching how search params are parsed', () => {
    expect(describeSearch('q=dentist&lat=19.07', labels)).toBe('dentist')
  })
})
