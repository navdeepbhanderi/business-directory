import type { Locale } from '@/i18n/config'
import type { Json } from '@/types/database'

/**
 * Resolves a translatable database field.
 *
 * Content lives as `name` plus `name_i18n jsonb` keyed by locale, so adding a
 * language needs no migration. Falls back to the base column rather than
 * rendering an empty string — a listing showing its English name to a Hindi
 * reader is imperfect; a listing showing nothing is broken.
 */
export function localizedText(base: string, i18n: Json | null | undefined, locale: Locale): string {
  if (i18n && typeof i18n === 'object' && !Array.isArray(i18n)) {
    const candidate = (i18n as Record<string, Json | undefined>)[locale]
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate
  }
  return base
}

/** Substitutes `{name}` placeholders in a dictionary string. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}
