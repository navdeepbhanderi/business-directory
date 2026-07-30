import type { Locale } from './config'
import type { Dictionary } from './dictionaries/en'

/**
 * Dynamic import per locale so only the active dictionary ships in the payload.
 * With eight-plus locales planned, shipping them all would be real weight.
 */
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en').then((m) => m.en),
  hi: () => import('./dictionaries/hi').then((m) => m.hi),
}

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]()
}
