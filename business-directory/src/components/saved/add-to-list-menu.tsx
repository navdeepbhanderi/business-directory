'use client'

import { useState } from 'react'
import { Check, ListPlus, Loader2, Plus } from 'lucide-react'
import {
  addToListAction,
  createListAction,
  removeFromListAction,
} from '@/lib/actions/saved'
import { LIST_NAME_MAX } from '@/lib/saved-schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSaved } from './saved-store'

export type AddToListLabels = {
  trigger: string
  title: string
  description: string
  empty: string
  newListLabel: string
  newListPlaceholder: string
  create: string
  signInPrompt: string
  visibilityNote: string
  errors: Record<string, string>
}

/**
 * Put a listing in a list, or take it out again.
 *
 * A dialog with a checkbox per list rather than a "choose one" select: someone
 * planning a weekend has a listing in several lists at once, and making that
 * cost several trips through a menu is the reason the prototype's lists went
 * unused. Creating a list here adds the listing to it in the same step, because
 * that is invariably why the list is being created.
 */
export function AddToListMenu({
  businessId,
  businessName,
  labels,
  className,
}: {
  businessId: string
  businessName: string
  labels: AddToListLabels
  className?: string
}) {
  const saved = useSaved()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  if (saved.loaded && !saved.signedIn) return null

  const containing = saved.listsContaining(businessId)

  async function toggleList(listId: string, next: boolean) {
    setError(null)
    saved.setInList(listId, businessId, next)

    const formData = new FormData()
    formData.set('listId', listId)
    formData.set('businessId', businessId)

    const result = next
      ? await addToListAction({}, formData)
      : await removeFromListAction({}, formData)

    if (result.errors?.['form']) {
      saved.setInList(listId, businessId, !next)
      setError(result.errors['form'])
      return
    }
  }

  async function createAndAdd() {
    const name = newName.trim()
    if (!name) return

    setError(null)
    setCreating(true)
    try {
      const listForm = new FormData()
      listForm.set('name', name)
      listForm.set('visibility', 'private')
      const created = await createListAction({}, listForm)

      const listId = created.ok ? created.message : undefined
      if (!listId) {
        setError(created.errors?.['form'] ?? 'failed')
        return
      }

      // The new list appears immediately, already containing this listing, which
      // is the only reason someone creates one from here.
      saved.addList({
        id: listId,
        name,
        visibility: 'private',
        shareSlug: null,
        businessIds: [businessId],
      })

      const itemForm = new FormData()
      itemForm.set('listId', listId)
      itemForm.set('businessId', businessId)
      const added = await addToListAction({}, itemForm)
      if (added.errors?.['form']) setError(added.errors['form'])

      setNewName('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={labels.trigger}
          aria-label={`${labels.trigger}: ${businessName}`}
          className={cn(
            'relative z-10 inline-flex size-9 items-center justify-center rounded-pill backdrop-blur',
            'bg-surface/80 text-ink-muted hover:bg-surface hover:text-ink',
            'transition-colors duration-(--duration-hover)',
            className,
          )}
        >
          <ListPlus className="size-4" aria-hidden />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="text-danger text-sm">
            {labels.errors[error] ?? labels.errors['failed']}
          </p>
        )}

        {saved.lists.length === 0 ? (
          <p className="text-ink-muted text-sm">{labels.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {saved.lists.map((list) => {
              const inList = containing.includes(list.id)
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    aria-pressed={inList}
                    onClick={() => void toggleList(list.id, !inList)}
                    className={cn(
                      'rounded-control flex w-full items-center gap-3 px-3 py-2 text-start text-sm',
                      'transition-colors duration-(--duration-hover)',
                      inList ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-sunken',
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-control flex size-5 shrink-0 items-center justify-center border',
                        inList ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong',
                      )}
                      aria-hidden
                    >
                      {inList && <Check className="size-3.5" />}
                    </span>
                    <span className="flex-1 truncate">{list.name}</span>
                    <span className="text-ink-muted num text-xs">{list.businessIds.length}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-line flex flex-col gap-2 border-t pt-4">
          <label htmlFor="new-list-name" className="text-ink text-sm font-medium">
            {labels.newListLabel}
          </label>
          <div className="flex gap-2">
            <Input
              id="new-list-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={labels.newListPlaceholder}
              maxLength={LIST_NAME_MAX}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void createAndAdd()}
              disabled={creating || newName.trim() === ''}
              className="shrink-0"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              {labels.create}
            </Button>
          </div>
          <p className="text-ink-muted text-xs">{labels.visibilityNote}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
