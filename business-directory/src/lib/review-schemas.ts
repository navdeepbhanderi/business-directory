import { z } from 'zod'

/**
 * Review input schemas.
 *
 * Bounds mirror the database CHECK constraints exactly. The database is the
 * enforcement point; these exist so someone gets a useful message in the form
 * rather than a 400 from PostgREST, and so the rules are testable without a
 * database.
 */

/** Matches `reviews_body_length` in the schema. */
export const REVIEW_MIN_LENGTH = 10
export const REVIEW_MAX_LENGTH = 3000
export const REVIEW_MAX_PHOTOS = 5

export const ratingSchema = z.coerce
  .number()
  .int('invalid')
  .min(1, 'required')
  .max(5, 'invalid')

export const reviewBodySchema = z
  .string()
  .trim()
  .min(REVIEW_MIN_LENGTH, 'too-short')
  .max(REVIEW_MAX_LENGTH, 'too-long')

export const reviewSchema = z.object({
  businessId: z.string().uuid('invalid'),
  rating: ratingSchema,
  body: reviewBodySchema,
})

export const reviewEditSchema = z.object({
  reviewId: z.string().uuid('invalid'),
  rating: ratingSchema,
  body: reviewBodySchema,
})

export const replySchema = z.object({
  reviewId: z.string().uuid('invalid'),
  businessId: z.string().uuid('invalid'),
  body: z.string().trim().min(2, 'too-short').max(2000, 'too-long'),
})

/**
 * Report reasons are a closed set.
 *
 * Free text alone would leave moderators guessing, and an open field is the
 * usual route for abuse to arrive dressed as a report.
 */
export const REPORT_REASONS = [
  'fake',
  'offensive',
  'wrong-business',
  'spam',
  'private-info',
  'other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const reportSchema = z.object({
  reviewId: z.string().uuid('invalid'),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(1000, 'too-long').optional(),
})

export const voteSchema = z.object({
  reviewId: z.string().uuid('invalid'),
})

export const REVIEW_SORTS = ['newest', 'helpful', 'highest', 'lowest'] as const
export type ReviewSort = (typeof REVIEW_SORTS)[number]

export function parseReviewSort(value: string | undefined): ReviewSort {
  return REVIEW_SORTS.find((option) => option === value) ?? 'newest'
}

/**
 * How long an author may edit.
 *
 * Matches the `reviews_update_own` policy window. After it closes the review is
 * part of the record — a business that earned a bad review should not be able to
 * wait for it to be quietly rewritten, and a reader should be able to trust that
 * a six-month-old review says what it said.
 */
export const EDIT_WINDOW_HOURS = 24

export function canStillEdit(createdAt: string | Date, now: Date = new Date()): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  if (Number.isNaN(created.getTime())) return false
  const elapsedHours = (now.getTime() - created.getTime()) / 3_600_000
  return elapsedHours >= 0 && elapsedHours < EDIT_WINDOW_HOURS
}
