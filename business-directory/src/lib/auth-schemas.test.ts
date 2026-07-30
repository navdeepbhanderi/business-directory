import { describe, expect, it } from 'vitest'
import {
  MIN_PASSWORD_LENGTH,
  emailSchema,
  otpVerifySchema,
  passwordSchema,
  phoneSchema,
  profileSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
} from './auth-schemas'

describe('emailSchema', () => {
  it('accepts a normal address and lowercases it', () => {
    expect(emailSchema.parse('  Priya.Patel@Example.COM ')).toBe('priya.patel@example.com')
  })

  it('rejects malformed addresses', () => {
    for (const value of ['', 'not-an-email', 'a@', '@b.com', 'a b@c.com']) {
      expect(emailSchema.safeParse(value).success, value).toBe(false)
    }
  })

  it('rejects addresses beyond the RFC 5321 length limit', () => {
    expect(emailSchema.safeParse(`${'a'.repeat(250)}@example.com`).success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('enforces the same floor as the Supabase config', () => {
    expect(passwordSchema.safeParse('a'.repeat(MIN_PASSWORD_LENGTH)).success).toBe(true)
    expect(passwordSchema.safeParse('a'.repeat(MIN_PASSWORD_LENGTH - 1)).success).toBe(false)
  })

  it('rejects passwords past bcrypt’s 72-byte limit', () => {
    // Bytes beyond 72 are silently ignored by bcrypt, so accepting them would
    // imply strength the hash does not actually have.
    expect(passwordSchema.safeParse('a'.repeat(72)).success).toBe(true)
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false)
  })
})

describe('phoneSchema', () => {
  it('accepts Indian mobile numbers and strips formatting', () => {
    expect(phoneSchema.parse('+91 98250 10101')).toBe('+919825010101')
    expect(phoneSchema.parse('+91-98250-10101')).toBe('+919825010101')
  })

  it('rejects numbers outside the Indian mobile range', () => {
    for (const value of [
      '+915825010101', // landline-style prefix
      '+9198250101', // too short
      '+91982501010199', // too long
      '9825010101', // no country code
      '+1 555 010 1010', // wrong country
      '',
    ]) {
      expect(phoneSchema.safeParse(value).success, value).toBe(false)
    }
  })
})

describe('signUpSchema', () => {
  it('accepts a complete signup', () => {
    const parsed = signUpSchema.parse({
      fullName: '  Priya Patel ',
      email: 'PRIYA@example.com',
      password: 'correct-horse-battery',
      locale: 'hi',
    })
    expect(parsed).toEqual({
      fullName: 'Priya Patel',
      email: 'priya@example.com',
      password: 'correct-horse-battery',
      locale: 'hi',
    })
  })

  it('defaults locale to en', () => {
    const parsed = signUpSchema.parse({
      fullName: 'Priya Patel',
      email: 'a@b.com',
      password: 'a'.repeat(12),
    })
    expect(parsed.locale).toBe('en')
  })

  it('rejects a one-character name', () => {
    const result = signUpSchema.safeParse({
      fullName: 'A',
      email: 'a@b.com',
      password: 'a'.repeat(12),
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported locale rather than coercing it', () => {
    expect(
      signUpSchema.safeParse({
        fullName: 'Priya Patel',
        email: 'a@b.com',
        password: 'a'.repeat(12),
        locale: 'fr',
      }).success,
    ).toBe(false)
  })
})

describe('signInSchema', () => {
  it('does not apply the length rule to an existing password', () => {
    // Enforcing it here would leak the policy and reject users whose password
    // predates a change to it.
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(true)
  })

  it('still requires something to be entered', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('requires the confirmation to match, and reports it on that field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'a'.repeat(12),
      confirm: 'b'.repeat(12),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({ confirm: 'mismatch' })
    }
  })

  it('accepts a matching pair', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'a'.repeat(12), confirm: 'a'.repeat(12) }).success,
    ).toBe(true)
  })
})

describe('otpVerifySchema', () => {
  it('requires exactly six digits', () => {
    expect(otpVerifySchema.safeParse({ phone: '+919825010101', token: '123456' }).success).toBe(
      true,
    )
    for (const token of ['12345', '1234567', '12a456', '']) {
      expect(otpVerifySchema.safeParse({ phone: '+919825010101', token }).success, token).toBe(
        false,
      )
    }
  })
})

describe('profileSchema', () => {
  it('allows an empty phone, meaning "not provided"', () => {
    expect(
      profileSchema.safeParse({ fullName: 'Priya Patel', locale: 'en', phone: '' }).success,
    ).toBe(true)
  })

  it('still validates a phone when one is given', () => {
    expect(
      profileSchema.safeParse({ fullName: 'Priya Patel', locale: 'en', phone: '12345' }).success,
    ).toBe(false)
  })
})

describe('toFieldErrors', () => {
  it('keys errors by field path and keeps the first per field', () => {
    const result = signUpSchema.safeParse({ fullName: 'A', email: 'nope', password: 'x' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = toFieldErrors(result.error)
      expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password'])
      expect(errors['fullName']).toBe('too-short')
    }
  })
})
