'use client'

import { useActionState, useState } from 'react'
import { BookmarkPlus } from 'lucide-react'
import Link from 'next/link'
import { saveSearchAction } from '@/lib/actions/saved'
import { SAVED_SEARCH_NAME_MAX, describeSearch } from '@/lib/saved-schemas'
import type { ActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSaved } from './saved-store'

/**
 * Save the current search.
 *
 * The name is pre-filled from what was actually searched for, because "Untitled
 * search" repeated six times is a list nobody reads. The query string is carried
 * in a hidden field rather than re-read in the action: the action runs on the
 * server, where the browser's URL is not available.
 */
export function SaveSearchButton({
  query,
  locale,
  returnTo,
  labels,
}: {
  query: string
  locale: string
  returnTo: string
  labels: {
    trigger: string
    title: string
    description: string
    nameLabel: string
    notify: string
    submit: string
    saved: string
    signIn: string
    anywhere: string
    openNow: string
    near: string
    errors: Record<string, string>
  }
}) {
  const saved = useSaved()
  const [state, formAction] = useActionState(saveSearchAction, {} as ActionState)
  const [open, setOpen] = useState(false)

  if (saved.loaded && !saved.signedIn) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/${locale}/auth/sign-in?next=${encodeURIComponent(returnTo)}`}>
          <BookmarkPlus />
          {labels.signIn}
        </Link>
      </Button>
    )
  }

  const suggestion = describeSearch(query, {
    anywhere: labels.anywhere,
    openNow: labels.openNow,
    near: labels.near,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookmarkPlus />
          {labels.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        {state.ok ? (
          <p role="status" className="rounded-control bg-success-soft text-success p-3 text-sm">
            {labels.saved}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="query" value={query} />

            {state.errors?.['form'] && (
              <p role="alert" className="text-danger text-sm">
                {labels.errors[state.errors['form']] ?? labels.errors['failed']}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="saved-search-name" className="text-ink text-sm font-medium">
                {labels.nameLabel}
              </label>
              <Input
                id="saved-search-name"
                name="name"
                defaultValue={suggestion}
                maxLength={SAVED_SEARCH_NAME_MAX}
                required
              />
            </div>

            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">{labels.notify}</span>
              <Switch name="notify" />
            </label>

            <Button type="submit" className="sm:w-auto sm:self-start">
              {labels.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
