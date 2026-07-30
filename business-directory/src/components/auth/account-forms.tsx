'use client'

import { useRef } from 'react'
import { Upload } from 'lucide-react'
import {
  deleteAccountAction,
  updateNotificationsAction,
  updateProfileAction,
  uploadAvatarAction,
} from '@/lib/actions/account'
import { localeMeta, locales, type Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Field, FormError, SubmitButton, useAuthAction, type AuthMessages } from './auth-form'

function Saved({ show, label }: { show: boolean; label: string }) {
  if (!show) return null
  return (
    <p role="status" className="rounded-control bg-success-soft text-success p-2.5 text-sm">
      {label}
    </p>
  )
}

export function ProfileForm({
  locale,
  defaults,
  labels,
  messages,
}: {
  locale: Locale
  defaults: { fullName: string; locale: string; phone: string }
  labels: { fullName: string; phone: string; language: string; submit: string; saved: string }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(updateProfileAction)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormError code={state.errors?.['form']} messages={messages} />
      <Saved show={state.ok === true} label={labels.saved} />

      <Field
        label={labels.fullName}
        name="fullName"
        defaultValue={defaults.fullName}
        autoComplete="name"
        error={state.errors?.['fullName']}
        messages={messages}
      />
      <Field
        label={labels.phone}
        name="phone"
        type="tel"
        inputMode="tel"
        required={false}
        defaultValue={defaults.phone}
        autoComplete="tel"
        error={state.errors?.['phone']}
        messages={messages}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profileLocale" className="text-ink text-sm font-medium">
          {labels.language}
        </label>
        <select
          id="profileLocale"
          name="profileLocale"
          defaultValue={defaults.locale}
          className="rounded-control border-line-strong bg-surface text-ink h-10 border px-3 text-sm"
        >
          {locales.map((value) => (
            <option key={value} value={value}>
              {localeMeta[value].label}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton label={labels.submit} className="sm:w-auto sm:self-start" />
    </form>
  )
}

export function AvatarForm({
  currentUrl,
  labels,
  messages,
}: {
  currentUrl: string | null
  labels: { title: string; upload: string; hint: string; saved: string }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(uploadAvatarAction)
  const input = useRef<HTMLInputElement | null>(null)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Saved show={state.ok === true} label={labels.saved} />
      <FormError code={state.errors?.['form']} messages={messages} />

      <div className="flex items-center gap-4">
        <span className="rounded-pill border-line bg-surface-sunken grid size-16 shrink-0 place-items-center overflow-hidden border">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied avatar, already sized
            <img src={currentUrl} alt="" className="size-full object-cover" />
          ) : (
            <Upload className="text-ink-muted size-5" aria-hidden />
          )}
        </span>

        <div className="flex flex-col gap-1.5">
          <input
            ref={input}
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="text-ink-muted file:rounded-control file:bg-surface-sunken file:text-ink text-sm file:me-3 file:border-0 file:px-3 file:py-1.5 file:text-sm"
            aria-describedby="avatar-hint"
          />
          <p id="avatar-hint" className="text-ink-muted text-xs">
            {labels.hint}
          </p>
          {state.errors?.['avatar'] && (
            <p className="text-danger text-sm">
              {messages[state.errors['avatar']] ?? messages['failed']}
            </p>
          )}
        </div>
      </div>

      <SubmitButton label={labels.upload} className="sm:w-auto sm:self-start" />
    </form>
  )
}

export function NotificationForm({
  defaults,
  labels,
  messages,
}: {
  defaults: {
    offers: boolean
    reviewsOnSaved: boolean
    cityPromotions: boolean
    emailEnabled: boolean
  }
  labels: {
    offers: string
    reviews: string
    promotions: string
    email: string
    submit: string
    saved: string
  }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(updateNotificationsAction)

  const rows = [
    { name: 'emailEnabled', label: labels.email, checked: defaults.emailEnabled },
    { name: 'reviewsOnSaved', label: labels.reviews, checked: defaults.reviewsOnSaved },
    { name: 'offers', label: labels.offers, checked: defaults.offers },
    { name: 'cityPromotions', label: labels.promotions, checked: defaults.cityPromotions },
  ]

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="frequency" value="instant" />
      <FormError code={state.errors?.['form']} messages={messages} />
      <Saved show={state.ok === true} label={labels.saved} />

      <ul className="divide-line rounded-card border-line divide-y border">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-4 p-4">
            <label htmlFor={row.name} className="text-ink text-sm">
              {row.label}
            </label>
            <Switch id={row.name} name={row.name} defaultChecked={row.checked} />
          </li>
        ))}
      </ul>

      <SubmitButton label={labels.submit} className="sm:w-auto sm:self-start" />
    </form>
  )
}

export function DeleteAccountForm({
  locale,
  labels,
  messages,
}: {
  locale: Locale
  labels: { warning: string; confirm: string; submit: string }
  messages: AuthMessages
}) {
  const [state, formAction] = useAuthAction(deleteAccountAction)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <p className="text-ink-muted text-sm">{labels.warning}</p>
      <FormError code={state.errors?.['form']} messages={messages} />

      <Field
        label={labels.confirm}
        name="confirm"
        autoComplete="off"
        error={state.errors?.['confirm']}
        messages={messages}
      />

      <Button type="submit" variant="danger" className="sm:w-auto sm:self-start">
        {labels.submit}
      </Button>
    </form>
  )
}
