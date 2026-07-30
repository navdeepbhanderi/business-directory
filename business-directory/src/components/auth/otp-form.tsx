'use client'

import { useState } from 'react'
import { requestOtpAction, verifyOtpAction } from '@/lib/actions/auth'
import type { Locale } from '@/i18n/config'
import { Field, FormError, SubmitButton, useAuthAction, type AuthMessages } from './auth-form'

/**
 * Two-step phone sign-in.
 *
 * The number is carried into step two as a hidden field rather than re-asked:
 * mistyping it after already receiving a code is a needless way to lose people.
 */
export function OtpForm({
  locale,
  next,
  labels,
  messages,
}: {
  locale: Locale
  next?: string
  labels: {
    phoneLabel: string
    phoneHint: string
    request: string
    codeLabel: string
    verify: string
    sent: string
    resend: string
  }
  messages: AuthMessages
}) {
  const [requestState, requestAction] = useAuthAction(requestOtpAction)
  const [verifyState, verifyAction] = useAuthAction(verifyOtpAction)
  const [phone, setPhone] = useState('')

  const codeSent = requestState.ok === true

  if (!codeSent) {
    return (
      <form action={requestAction} className="flex flex-col gap-4">
        <FormError code={requestState.errors?.['form']} messages={messages} />
        <div onChange={(event) => setPhone((event.target as HTMLInputElement).value)}>
          <Field
            label={labels.phoneLabel}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            hint={labels.phoneHint}
            error={requestState.errors?.['phone']}
            messages={messages}
          />
        </div>
        <SubmitButton label={labels.request} />
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="rounded-control bg-success-soft text-success p-3 text-sm">
        {labels.sent}
      </p>

      <form action={verifyAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="phone" value={phone} />
        {next && <input type="hidden" name="next" value={next} />}

        <FormError code={verifyState.errors?.['form']} messages={messages} />

        <Field
          label={labels.codeLabel}
          name="token"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          error={verifyState.errors?.['token']}
          messages={messages}
        />
        <SubmitButton label={labels.verify} />
      </form>

      <form action={requestAction}>
        <input type="hidden" name="phone" value={phone} />
        <button
          type="submit"
          className="text-ink-muted hover:text-ink text-sm underline-offset-4 hover:underline"
        >
          {labels.resend}
        </button>
      </form>
    </div>
  )
}
