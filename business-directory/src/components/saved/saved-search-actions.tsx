'use client'

import { useActionState } from 'react'
import { deleteSavedSearchAction } from '@/lib/actions/saved'
import type { ActionState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

/** Remove a saved search. One button, no confirmation: it is trivially re-saved. */
export function DeleteSavedSearchButton({
  searchId,
  labels,
}: {
  searchId: string
  labels: { delete: string; errors: Record<string, string> }
}) {
  const [state, formAction] = useActionState(deleteSavedSearchAction, {} as ActionState)

  if (state.ok) return null

  return (
    <form action={formAction}>
      <input type="hidden" name="searchId" value={searchId} />
      <Button type="submit" variant="ghost" size="sm">
        {labels.delete}
      </Button>
      {state.errors?.['form'] && (
        <span role="alert" className="text-danger ms-2 text-xs">
          {labels.errors[state.errors['form']] ?? labels.errors['failed']}
        </span>
      )}
    </form>
  )
}
