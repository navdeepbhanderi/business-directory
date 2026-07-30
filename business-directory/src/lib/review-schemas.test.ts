import { describe, expect, it } from 'vitest'
import {
  EDIT_WINDOW_HOURS,
  REVIEW_MAX_LENGTH,
  REVIEW_MIN_LENGTH,
  canStillEdit,
  parseReviewSort,
  ratingSchema,
  reportSchema,
  reviewBodySchema,
  reviewSchema,
} from './review-schemas'

const UUID = '3fe5b2a6-8f26-47d1-abbc-4f4fd129fe4d'

describe('ratingSchema', () => {
  it('accepts whole stars 1 through 5', () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(ratingSchema.safeParse(value).success, String(value)).toBe(true)
    }
  })

  it('accepts a form string, since that is what arrives', () => {
    expect(ratingSchema.parse('4')).toBe(4)
  })

  it('rejects out-of-range and fractional ratings', () => {
    for (const value of [0, 6, -1, 3.5, 'x', '']) {
      expect(ratingSchema.safeParse(value).success, String(value)).toBe(false)
    }
  })
})

describe('reviewBodySchema', () => {
  it('mirrors the database length constraint', () => {
    expect(reviewBodySchema.safeParse('a'.repeat(REVIEW_MIN_LENGTH)).success).toBe(true)
    expect(reviewBodySchema.safeParse('a'.repeat(REVIEW_MIN_LENGTH - 1)).success).toBe(false)
    expect(reviewBodySchema.safeParse('a'.repeat(REVIEW_MAX_LENGTH)).success).toBe(true)
    expect(reviewBodySchema.safeParse('a'.repeat(REVIEW_MAX_LENGTH + 1)).success).toBe(false)
  })

  it('counts after trimming, so padding does not satisfy the minimum', () => {
    expect(reviewBodySchema.safeParse(`   ${'a'.repeat(5)}   `).success).toBe(false)
  })
})

describe('reviewSchema', () => {
  it('accepts a complete review', () => {
    expect(
      reviewSchema.safeParse({
        businessId: UUID,
        rating: '5',
        body: 'Genuinely good, and the staff were patient with a long order.',
      }).success,
    ).toBe(true)
  })

  it('rejects a malformed business id rather than passing it to the database', () => {
    expect(
      reviewSchema.safeParse({ businessId: 'not-a-uuid', rating: 5, body: 'a'.repeat(20) }).success,
    ).toBe(false)
  })
})

describe('reportSchema', () => {
  it('accepts a known reason', () => {
    expect(reportSchema.safeParse({ reviewId: UUID, reason: 'fake' }).success).toBe(true)
  })

  it('rejects an unknown reason rather than storing free text', () => {
    expect(reportSchema.safeParse({ reviewId: UUID, reason: 'because-i-said-so' }).success).toBe(
      false,
    )
  })

  it('allows optional detail within bounds', () => {
    expect(
      reportSchema.safeParse({ reviewId: UUID, reason: 'other', detail: 'a'.repeat(1000) }).success,
    ).toBe(true)
    expect(
      reportSchema.safeParse({ reviewId: UUID, reason: 'other', detail: 'a'.repeat(1001) }).success,
    ).toBe(false)
  })
})

describe('parseReviewSort', () => {
  it('falls back to newest for anything unrecognised', () => {
    expect(parseReviewSort('helpful')).toBe('helpful')
    expect(parseReviewSort('lowest')).toBe('lowest')
    expect(parseReviewSort('cheapest')).toBe('newest')
    expect(parseReviewSort(undefined)).toBe('newest')
  })
})

describe('canStillEdit', () => {
  const now = new Date('2026-07-30T12:00:00Z')

  it('allows an edit inside the window', () => {
    expect(canStillEdit('2026-07-30T11:00:00Z', now)).toBe(true)
    expect(canStillEdit(new Date('2026-07-29T12:30:00Z'), now)).toBe(true)
  })

  it('refuses once the window has closed', () => {
    // Exactly at the boundary is closed, matching the policy's strict comparison.
    expect(canStillEdit('2026-07-29T12:00:00Z', now)).toBe(false)
    expect(canStillEdit('2026-07-01T12:00:00Z', now)).toBe(false)
  })

  it('refuses a future timestamp rather than trusting it', () => {
    expect(canStillEdit('2026-08-01T12:00:00Z', now)).toBe(false)
  })

  it('refuses an unparseable timestamp', () => {
    expect(canStillEdit('not a date', now)).toBe(false)
  })

  it('matches the documented window length', () => {
    expect(EDIT_WINDOW_HOURS).toBe(24)
  })
})
