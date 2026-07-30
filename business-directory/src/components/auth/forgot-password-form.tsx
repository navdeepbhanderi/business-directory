'use client'

import { forgotPasswordAction } from '@/lib/actions/auth'
import type { Locale } from '@/i18n/config'
import { Field, FormError, SubmitButton, useAuthAction, type AuthMessages } from './auth-form'

export function ForgotPasswordForm({
  locale,
  labels,
  messages,
}: {
  locale: Locale
  labels: { email: string; submit: string; sent: string }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(forgotPasswordAction)

  // Confirmed regardless of whether the address exists — otherwise this form is
  // an account-existence check.
  if (state.ok) {
    return (
      <p role="status" className="rounded-control bg-success-soft text-success p-3 text-sm">
        {labels.sent}
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormError code={state.errors?.['form']} messages={messages} />
      <Field
        label={labels.email}
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors?.['email']}
        messages={messages}
      />
      <SubmitButton label={labels.submit} />
    </form>
  )
}
