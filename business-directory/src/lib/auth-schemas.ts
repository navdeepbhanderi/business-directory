import { z } from 'zod'

/**
 * Auth input schemas.
 *
 * Kept separate from the Server Actions so they can be unit-tested without a
 * database, and reused by the client for inline feedback — one definition of
 * what a valid password is, rather than two that drift.
 */

/** Matches `minimum_password_length` in supabase/config.toml. */
export const MIN_PASSWORD_LENGTH = 10

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .max(254, 'too-long') // RFC 5321 limit; longer is malformed, not merely long
  .email('invalid')
  .toLowerCase()

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, 'too-short')
  // 72 bytes is bcrypt's hard limit: anything beyond it is silently ignored, so
  // accepting a longer password would imply strength that does not exist.
  .max(72, 'too-long')

export const fullNameSchema = z.string().trim().min(2, 'too-short').max(80, 'too-long')

/**
 * Indian mobile numbers in E.164.
 *
 * Deliberately strict: `+91` followed by a 10-digit number starting 6–9, which
 * is the whole of the current Indian mobile range. Accepting looser input would
 * mean OTPs sent into the void with no way to tell the user why.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^\+91[6-9]\d{9}$/.test(value), 'invalid')

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  locale: z.enum(['en', 'hi']).default('en'),
})

export const signInSchema = z.object({
  email: emailSchema,
  // Not `passwordSchema`: rejecting a short password at sign-in would tell an
  // attacker the length rule and gains nothing — the credential is either
  // correct or it is not.
  password: z.string().min(1, 'required'),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'mismatch',
  })

export const otpRequestSchema = z.object({ phone: phoneSchema })

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'invalid'),
})

export const profileSchema = z.object({
  fullName: fullNameSchema,
  locale: z.enum(['en', 'hi']),
  phone: z.union([phoneSchema, z.literal('')]).optional(),
})

export const notificationSchema = z.object({
  offers: z.coerce.boolean(),
  reviewsOnSaved: z.coerce.boolean(),
  cityPromotions: z.coerce.boolean(),
  emailEnabled: z.coerce.boolean(),
  frequency: z.enum(['instant', 'daily', 'weekly']),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ProfileInput = z.infer<typeof profileSchema>

/** Field-keyed errors, which is the shape the forms render. */
export type FieldErrors = Record<string, string>

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    result[key] ??= issue.message
  }
  return result
}
