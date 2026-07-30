import { describe, expect, it } from 'vitest'
import { locales, localeMeta, plannedLocales } from '../config'
import { getDictionary } from '../get-dictionary'
import { en } from './en'
import { hi } from './hi'

/**
 * Parity is already a compile-time guarantee (every locale is typed as
 * `Dictionary`), so this suite covers the two things types cannot catch: a
 * translation left as its English source string, and empty values.
 *
 * This matters more with every locale added — the plan targets eight-plus.
 */

type Leaf = { path: string; value: string }

function flatten(value: unknown, path: string[] = []): Leaf[] {
  if (typeof value === 'string') return [{ path: path.join('.'), value }]
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, [...path, key]))
  }
  return []
}

/** Every non-English locale, with the script its values must be written in. */
const translated = [{ code: 'hi', dict: hi, script: /[ऀ-ॿ]/ }] as const

const enLeaves = flatten(en)

describe('dictionary parity', () => {
  it.each(translated.map((t) => t.code))('%s exposes the same key paths as en', (code) => {
    const entry = translated.find((t) => t.code === code)!
    const paths = flatten(entry.dict)
      .map((l) => l.path)
      .sort()
    expect(paths).toEqual(enLeaves.map((l) => l.path).sort())
  })

  it('has no empty or whitespace-only values in any locale', () => {
    const all = [enLeaves, ...translated.map((t) => flatten(t.dict))].flat()
    for (const { path, value } of all) {
      expect(value.trim(), `empty value at ${path}`).not.toBe('')
    }
  })

  it.each(translated.map((t) => t.code))('%s has no value left as its English source', (code) => {
    const entry = translated.find((t) => t.code === code)!
    const byPath = new Map(enLeaves.map((l) => [l.path, l.value]))
    // Proper nouns and brand names may legitimately match; none exist yet.
    const allowed = new Set<string>()

    const untranslated = flatten(entry.dict)
      .filter((l) => !allowed.has(l.path) && byPath.get(l.path) === l.value)
      .map((l) => l.path)

    expect(untranslated).toEqual([])
  })

  it.each(translated.map((t) => t.code))('%s is written in its own script', (code) => {
    const entry = translated.find((t) => t.code === code)!
    const missing = flatten(entry.dict)
      .filter((l) => !entry.script.test(l.value))
      .map((l) => l.path)
    expect(missing).toEqual([])
  })

  it('loads a dictionary for every declared locale', async () => {
    for (const locale of locales) {
      const dict = await getDictionary(locale)
      expect(dict.meta.title.length).toBeGreaterThan(0)
    }
  })

  it('covers every shipped locale in this suite', () => {
    // Guards against adding a locale and forgetting to assert on it.
    const asserted = new Set<string>(['en', ...translated.map((t) => t.code)])
    expect(locales.filter((l) => !asserted.has(l))).toEqual([])
  })

  it('declares metadata for every shipped locale, and none for planned ones', () => {
    for (const locale of locales) {
      expect(localeMeta[locale].tag).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
      expect(localeMeta[locale].label.length).toBeGreaterThan(0)
    }
    // Planned locales must stay out of the shipped list until translated.
    const overlap = (plannedLocales as readonly string[]).filter((p) =>
      (locales as readonly string[]).includes(p),
    )
    expect(overlap).toEqual([])
  })
})
