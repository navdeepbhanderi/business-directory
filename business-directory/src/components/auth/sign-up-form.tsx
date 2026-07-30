'use client'

import { signUpAction } from '@/lib/actions/auth'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth-schemas'
import type { Locale } from '@/i18n/config'
import { interpolate } from '@/lib/i18n-content'
import { Field, FormError, SubmitButton, useAuthAction, type AuthMessages } from './auth-form'

export function SignUpForm({
  locale,
  labels,
  messages,
}: {
  locale: Locale
  labels: {
    fullName: string
    email: string
    password: string
    passwordHint: string
    submit: string
  }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(signUpAction)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <FormError code={state.errors?.['form']} messages={messages} />

      <Field
        label={labels.fullName}
        name="fullName"
        autoComplete="name"
        error={state.errors?.['fullName']}
        messages={messages}
      />
      <Field
        label={labels.email}
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors?.['email']}
        messages={messages}
      />
      <Field
        label={labels.password}
        name="password"
        type="password"
        autoComplete="new-password"
        hint={interpolate(labels.passwordHint, { count: MIN_PASSWORD_LENGTH })}
        error={state.errors?.['password']}
        messages={messages}
      />

      <SubmitButton label={labels.submit} />
    </form>
  )
}
