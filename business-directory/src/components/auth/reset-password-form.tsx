'use client'

import { resetPasswordAction } from '@/lib/actions/auth'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth-schemas'
import type { Locale } from '@/i18n/config'
import { Field, FormError, SubmitButton, useAuthAction, type AuthMessages } from './auth-form'

export function ResetPasswordForm({
  locale,
  labels,
  messages,
}: {
  locale: Locale
  labels: { password: string; confirm: string; submit: string }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(resetPasswordAction)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormError code={state.errors?.['form']} messages={messages} />
      <Field
        label={labels.password}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        error={state.errors?.['password']}
        messages={messages}
      />
      <Field
        label={labels.confirm}
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={state.errors?.['confirm']}
        messages={messages}
      />
      <SubmitButton label={labels.submit} />
    </form>
  )
}
