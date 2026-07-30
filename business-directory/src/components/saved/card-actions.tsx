import type { Dictionary } from '@/i18n/dictionaries/en'
import { FavoriteButton, type FavoriteLabels } from './favorite-button'
import { AddToListMenu, type AddToListLabels } from './add-to-list-menu'

/**
 * The save controls, in one place.
 *
 * They appear on the home page, on search results, beside the map, on a listing,
 * in an account page, and on a shared list. Assembling the label objects at each
 * of those call sites is six chances to pass a different set, so this does it
 * once. A Server Component: it only composes client islands.
 */

export function favoriteLabels(dict: Dictionary): FavoriteLabels {
  return {
    save: dict.saved.save,
    saved: dict.saved.saved,
    signIn: dict.saved.signInToSave,
    errors: dict.saved.errors,
  }
}

export function addToListLabels(dict: Dictionary): AddToListLabels {
  return {
    trigger: dict.saved.addToList,
    title: dict.saved.addToList,
    description: dict.saved.addToListDescription,
    empty: dict.saved.noLists,
    newListLabel: dict.saved.newList,
    newListPlaceholder: dict.saved.newListPlaceholder,
    create: dict.saved.create,
    signInPrompt: dict.saved.signInToSave,
    visibilityNote: dict.saved.privateNote,
    errors: dict.saved.errors,
  }
}

export function CardActions({
  businessId,
  businessName,
  locale,
  dict,
  returnTo,
}: {
  businessId: string
  businessName: string
  locale: string
  dict: Dictionary
  returnTo?: string
}) {
  return (
    <>
      <FavoriteButton
        businessId={businessId}
        businessName={businessName}
        locale={locale}
        {...(returnTo ? { returnTo } : {})}
        labels={favoriteLabels(dict)}
      />
      <AddToListMenu
        businessId={businessId}
        businessName={businessName}
        labels={addToListLabels(dict)}
      />
    </>
  )
}
