'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Loader2, Plus, Share2, Trash2 } from 'lucide-react'
import {
  addToListAction,
  createListAction,
  deleteListAction,
  removeFromListAction,
  reorderListAction,
  updateListAction,
} from '@/lib/actions/saved'
import {
  LIST_DESCRIPTION_MAX,
  LIST_NAME_MAX,
  LIST_NOTE_MAX,
  LIST_VISIBILITIES,
  type ListVisibility,
} from '@/lib/saved-schemas'
import type { ActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/*
 * None of these call `router.refresh()`.
 *
 * Every action here ends in `revalidatePath`, so Next re-renders the current tree
 * as part of the action's response and the page behind the dialog is already
 * correct. Refreshing as well would be a second round trip for the same data —
 * and the obvious way to write it (setState during render, or in an effect that
 * watches the result) is exactly the cascading-render pattern React warns about.
 */

export type ListFormLabels = {
  create: string
  createTitle: string
  edit: string
  editTitle: string
  nameLabel: string
  namePlaceholder: string
  descriptionLabel: string
  descriptionPlaceholder: string
  visibilityLabel: string
  visibility: Record<ListVisibility, string>
  save: string
  saved: string
  delete: string
  deleteConfirm: string
  errors: Record<string, string>
}

/** Shared fields, so create and edit cannot drift apart. */
function ListFields({
  labels,
  state,
  defaults,
}: {
  labels: ListFormLabels
  state: ActionState
  defaults?: { name: string; description: string | null; visibility: ListVisibility }
}) {
  return (
    <>
      {state.errors?.['form'] && (
        <p role="alert" className="text-danger text-sm">
          {labels.errors[state.errors['form']] ?? labels.errors['failed']}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="list-name" className="text-ink text-sm font-medium">
          {labels.nameLabel}
        </label>
        <Input
          id="list-name"
          name="name"
          defaultValue={defaults?.name ?? ''}
          placeholder={labels.namePlaceholder}
          maxLength={LIST_NAME_MAX}
          required
          aria-invalid={state.errors?.['name'] ? true : undefined}
        />
        {state.errors?.['name'] && (
          <p className="text-danger text-sm">
            {labels.errors[state.errors['name']] ?? labels.errors['failed']}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="list-description" className="text-ink text-sm font-medium">
          {labels.descriptionLabel}
        </label>
        <Textarea
          id="list-description"
          name="description"
          defaultValue={defaults?.description ?? ''}
          placeholder={labels.descriptionPlaceholder}
          maxLength={LIST_DESCRIPTION_MAX}
          rows={3}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink mb-1 text-sm font-medium">{labels.visibilityLabel}</legend>
        {LIST_VISIBILITIES.map((option) => (
          <label key={option} className="text-ink flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value={option}
              defaultChecked={(defaults?.visibility ?? 'private') === option}
              className="mt-0.5"
            />
            {labels.visibility[option]}
          </label>
        ))}
      </fieldset>
    </>
  )
}

export function CreateListDialog({ labels }: { labels: ListFormLabels }) {
  const [state, formAction] = useActionState(createListAction, {} as ActionState)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          {labels.create}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.createTitle}</DialogTitle>
        </DialogHeader>
        {state.ok ? (
          <p role="status" className="rounded-control bg-success-soft text-success p-3 text-sm">
            {labels.saved}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <ListFields labels={labels} state={state} />
            <Button type="submit" className="sm:w-auto sm:self-start">
              {labels.create}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function EditListDialog({
  list,
  labels,
}: {
  list: { id: string; name: string; description: string | null; visibility: ListVisibility }
  labels: ListFormLabels
}) {
  const [state, formAction] = useActionState(updateListAction, {} as ActionState)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {labels.edit}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.editTitle}</DialogTitle>
        </DialogHeader>
        {state.ok ? (
          <p role="status" className="rounded-control bg-success-soft text-success p-3 text-sm">
            {labels.saved}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="listId" value={list.id} />
            <ListFields labels={labels} state={state} defaults={list} />
            <Button type="submit" className="sm:w-auto sm:self-start">
              {labels.save}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DeleteListButton({
  listId,
  labels,
}: {
  listId: string
  labels: { delete: string; confirm: string }
}) {
  const [state, formAction] = useActionState(deleteListAction, {} as ActionState)
  const [confirming, setConfirming] = useState(false)

  if (state.ok) return null

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 />
        {labels.delete}
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="listId" value={listId} />
      <span className="text-ink-muted text-sm">{labels.confirm}</span>
      <Button type="submit" variant="danger" size="sm">
        {labels.delete}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        ×
      </Button>
    </form>
  )
}

/**
 * Share controls.
 *
 * The link is built in the browser from `location.origin`, because the same list
 * is reachable on localhost, a preview deployment, and production, and a link
 * built server-side would be wrong on two of the three.
 */
export function ShareControls({
  list,
  locale,
  labels,
}: {
  list: { id: string; name: string; description: string | null; visibility: ListVisibility; shareSlug: string | null }
  locale: string
  labels: {
    heading: string
    body: string
    copy: string
    copied: string
    turnOff: string
    turnOffNote: string
    share: string
    errors: Record<string, string>
  }
}) {
  const [state, formAction] = useActionState(updateListAction, {} as ActionState)
  const [copied, setCopied] = useState(false)

  const slug = list.shareSlug
  const shared = list.visibility !== 'private' && slug !== null

  async function copy() {
    if (!slug) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${locale}/list/${slug}`)
      setCopied(true)
    } catch {
      // Clipboard access can be refused; the input below is selectable, so the
      // link is still obtainable.
    }
  }

  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
      <h2 className="flex items-center gap-2 text-base">
        <Share2 className="size-4" aria-hidden />
        {labels.heading}
      </h2>

      {state.errors?.['form'] && (
        <p role="alert" className="text-danger text-sm">
          {labels.errors[state.errors['form']] ?? labels.errors['failed']}
        </p>
      )}

      {shared ? (
        <>
          <p className="text-ink-muted text-sm">{labels.body}</p>
          <div className="flex flex-wrap gap-2">
            <Input
              readOnly
              value={`/${locale}/list/${slug}`}
              className="min-w-0 flex-1 font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? labels.copied : labels.copy}
            </Button>
          </div>

          <form action={formAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="listId" value={list.id} />
            <input type="hidden" name="name" value={list.name} />
            <input type="hidden" name="description" value={list.description ?? ''} />
            <input type="hidden" name="visibility" value="private" />
            <Button type="submit" variant="outline" size="sm" className="self-start">
              {labels.turnOff}
            </Button>
            <p className="text-ink-muted text-xs">{labels.turnOffNote}</p>
          </form>
        </>
      ) : (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="listId" value={list.id} />
          <input type="hidden" name="name" value={list.name} />
          <input type="hidden" name="description" value={list.description ?? ''} />
          <input type="hidden" name="visibility" value="unlisted" />
          <Button type="submit" size="sm" className="self-start">
            <Share2 />
            {labels.share}
          </Button>
        </form>
      )}
    </section>
  )
}

/**
 * Per-item controls: a note, the order, and removal.
 *
 * Up/down buttons rather than drag and drop. Dragging is unusable by keyboard,
 * awkward on touch, and needs a library; two buttons are none of those things and
 * the whole order is submitted in one statement either way.
 */
export function ListItemControls({
  listId,
  businessId,
  note,
  canMoveUp,
  canMoveDown,
  order,
  labels,
}: {
  listId: string
  businessId: string
  note: string | null
  canMoveUp: boolean
  canMoveDown: boolean
  /** Current order of the whole list, so a move can submit the result. */
  order: string[]
  labels: {
    notePlaceholder: string
    noteSave: string
    remove: string
    moveUp: string
    moveDown: string
    errors: Record<string, string>
  }
}) {
  const [pending, setPending] = useState<null | 'note' | 'move' | 'remove'>(null)
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState(note ?? '')

  async function run(kind: 'note' | 'move' | 'remove', work: () => Promise<ActionState>) {
    setPending(kind)
    setError(null)
    try {
      const result = await work()
      if (result.errors?.['form']) setError(result.errors['form'])
    } finally {
      setPending(null)
    }
  }

  function move(direction: -1 | 1) {
    const index = order.indexOf(businessId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return

    const next = [...order]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)

    void run('move', () => {
      const formData = new FormData()
      formData.set('listId', listId)
      formData.set('businessIds', next.join(','))
      return reorderListAction({}, formData)
    })
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={`note-${businessId}`} className="sr-only">
            {labels.notePlaceholder}
          </label>
          <Input
            id={`note-${businessId}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={labels.notePlaceholder}
            maxLength={LIST_NOTE_MAX}
            className="h-9 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null || value === (note ?? '')}
          onClick={() =>
            void run('note', () => {
              const formData = new FormData()
              formData.set('listId', listId)
              formData.set('businessId', businessId)
              formData.set('note', value)
              return addToListAction({}, formData)
            })
          }
        >
          {pending === 'note' ? <Loader2 className="animate-spin" /> : null}
          {labels.noteSave}
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <IconAction
          label={labels.moveUp}
          disabled={!canMoveUp || pending !== null}
          onClick={() => move(-1)}
        >
          <ArrowUp className="size-4" aria-hidden />
        </IconAction>
        <IconAction
          label={labels.moveDown}
          disabled={!canMoveDown || pending !== null}
          onClick={() => move(1)}
        >
          <ArrowDown className="size-4" aria-hidden />
        </IconAction>

        <button
          type="button"
          disabled={pending !== null}
          onClick={() =>
            void run('remove', () => {
              const formData = new FormData()
              formData.set('listId', listId)
              formData.set('businessId', businessId)
              return removeFromListAction({}, formData)
            })
          }
          className="text-ink-muted hover:text-danger ms-auto text-xs underline-offset-4 hover:underline disabled:opacity-50"
        >
          {labels.remove}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-danger text-xs">
          {labels.errors[error] ?? labels.errors['failed']}
        </p>
      )}
    </div>
  )
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-control border-line text-ink-muted inline-flex size-8 items-center justify-center border',
        'hover:border-line-strong hover:text-ink transition-colors duration-(--duration-hover)',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {children}
    </button>
  )
}
