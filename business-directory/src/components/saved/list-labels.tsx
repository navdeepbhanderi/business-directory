import type { Dictionary } from '@/i18n/dictionaries/en'
import type { ListFormLabels } from './list-forms'

/**
 * List form labels, assembled once.
 *
 * Three pages render these forms; three copies of this object is three chances
 * for one of them to be missing a field or holding a stale string.
 */
export function listFormLabels(dict: Dictionary): ListFormLabels {
  return {
    create: dict.saved.createList,
    createTitle: dict.saved.createListTitle,
    edit: dict.saved.edit,
    editTitle: dict.saved.editList,
    nameLabel: dict.saved.nameLabel,
    namePlaceholder: dict.saved.namePlaceholder,
    descriptionLabel: dict.saved.descriptionLabel,
    descriptionPlaceholder: dict.saved.descriptionPlaceholder,
    visibilityLabel: dict.saved.visibilityLabel,
    visibility: dict.saved.visibility,
    save: dict.saved.saveChanges,
    saved: dict.saved.savedChanges,
    delete: dict.saved.delete,
    deleteConfirm: dict.saved.deleteConfirm,
    errors: dict.saved.errors,
  }
}
