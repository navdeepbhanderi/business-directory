'use client'

import Link from 'next/link'
import { signInAction } from '@/lib/actions/auth'
import type { Locale } from '@/i18n/config'
import { Field, FormError, SubmitButton, useAuthAction, type AuthMessages } from './auth-form'

export function SignInForm({
  locale,
  next,
  labels,
  messages,
}: {
  locale: Locale
  next?: string
  labels: {
    email: string
    password: string
    submit: string
    forgot: string
  }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(signInAction)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      <FormError code={state.errors?.['form']} messages={messages} />

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
        autoComplete="current-password"
        error={state.errors?.['password']}
        messages={messages}
      />

      <SubmitButton label={labels.submit} />

      <Link
        href={`/${locale}/auth/forgot-password`}
        className="text-ink-muted hover:text-ink self-start text-sm underline-offset-4 hover:underline"
      >
        {labels.forgot}
      </Link>
    </form>
  )
}
