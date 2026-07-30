import type { Dictionary } from '@/i18n/dictionaries/en'
import type { AuthMessages } from '@/components/auth/auth-form'

/**
 * Maps the error codes the Server Actions return onto localised copy.
 *
 * The actions return codes, not sentences, so validation lives in one place and
 * is testable without a dictionary — and so the same failure reads correctly in
 * every locale.
 */
export function authMessages(dict: Dictionary): AuthMessages {
  return {
    required: dict.auth.errors.required,
    invalid: dict.auth.errors.invalid,
    'too-short': dict.auth.errors.tooShort,
    'too-long': dict.auth.errors.tooLong,
    mismatch: dict.auth.errors.mismatch,
    'invalid-credentials': dict.auth.errors.invalidCredentials,
    exists: dict.auth.errors.exists,
    failed: dict.auth.errors.failed,
    expired: dict.auth.errors.expired,
    link: dict.auth.errors.link,
    'otp-unavailable': dict.auth.errors.otpUnavailable,
  }
}
