'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { ActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Shared plumbing for every auth form.
 *
 * Built on `useActionState`, so the form posts and works before hydration —
 * which matters most on exactly this screen: someone on a slow connection can
 * still sign in while the JavaScript is in flight.
 */

export type AuthMessages = Record<string, string>

export function FieldError({
  code,
  messages,
  id,
}: {
  code: string | undefined
  messages: AuthMessages
  id: string
}) {
  if (!code) return null
  return (
    <p id={id} className="text-danger text-sm">
      {messages[code] ?? messages['failed']}
    </p>
  )
}

export function FormError({
  code,
  messages,
}: {
  code: string | undefined
  messages: AuthMessages
}) {
  if (!code) return null
  return (
    <p
      role="alert"
      className="rounded-control border-danger/40 bg-danger-soft text-danger flex items-start gap-2 border p-3 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {messages[code] ?? messages['failed']}
    </p>
  )
}

export function SubmitButton({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className={cn('w-full', className)} disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {label}
    </Button>
  )
}

export function useAuthAction(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
) {
  return useActionState(action, {} as ActionState)
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required = true,
  hint,
  error,
  messages,
  defaultValue,
  inputMode,
  pattern,
  maxLength,
  minLength,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  required?: boolean
  hint?: string
  error?: string
  messages: AuthMessages
  defaultValue?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  pattern?: string
  maxLength?: number
  minLength?: number
}) {
  const id = `field-${name}`
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        minLength={minLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'rounded-control bg-surface text-ink h-10 w-full border px-3 text-sm',
          'placeholder:text-ink-muted transition-colors duration-(--duration-hover)',
          error ? 'border-danger' : 'border-line-strong hover:border-ink-muted',
        )}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-ink-muted text-xs">
          {hint}
        </p>
      )}
      <FieldError code={error} messages={messages} id={`${id}-error`} />
    </div>
  )
}
