import { describe, expect, it } from 'vitest'
import { negotiateLocale, parseAcceptLanguage } from './negotiate'

describe('parseAcceptLanguage', () => {
  it('orders tags by descending q-value', () => {
    expect(parseAcceptLanguage('en;q=0.5,hi;q=0.9,fr;q=0.1')).toEqual(['hi', 'en', 'fr'])
  })

  it('treats a missing q-value as the highest preference', () => {
    expect(parseAcceptLanguage('hi-IN,en;q=0.8')).toEqual(['hi-in', 'en'])
  })

  it('drops entries explicitly refused with q=0', () => {
    expect(parseAcceptLanguage('en,hi;q=0')).toEqual(['en'])
  })

  it('degrades rather than throwing on a malformed q-value', () => {
    expect(parseAcceptLanguage('hi;q=banana,en;q=0.5')).toEqual(['en'])
  })

  it('returns an empty list for an empty header', () => {
    expect(parseAcceptLanguage('')).toEqual([])
  })
})

describe('negotiateLocale', () => {
  it('prefers an explicit cookie over the browser header', () => {
    expect(negotiateLocale({ cookie: 'hi', acceptLanguage: 'en-US,en;q=0.9' })).toBe('hi')
  })

  it('ignores a cookie holding an unsupported locale', () => {
    expect(negotiateLocale({ cookie: 'fr', acceptLanguage: 'hi' })).toBe('hi')
  })

  it('matches on the base subtag so regional variants resolve', () => {
    expect(negotiateLocale({ acceptLanguage: 'ar-BH,hi;q=0.9' })).toBe('hi')
  })

  it('skips unsupported languages and picks the first supported one', () => {
    expect(negotiateLocale({ acceptLanguage: 'fr-FR,de;q=0.9,en;q=0.5' })).toBe('en')
  })

  it('falls back to English when nothing matches', () => {
    expect(negotiateLocale({ acceptLanguage: 'fr-FR,de;q=0.9' })).toBe('en')
    expect(negotiateLocale({})).toBe('en')
  })
})
