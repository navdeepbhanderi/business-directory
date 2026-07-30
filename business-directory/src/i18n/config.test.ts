import { describe, expect, it } from 'vitest'
import {
  defaultLocale,
  defaultMarket,
  getMarket,
  isLocale,
  localeDirection,
  locales,
  markets,
} from './config'

describe('locale registry', () => {
  it('includes the default locale in the shipped list', () => {
    expect(locales).toContain(defaultLocale)
  })

  it('recognises shipped locales and rejects everything else', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('hi')).toBe(true)
    // Planned but not yet translated — must not resolve as shippable.
    expect(isLocale('ur')).toBe(false)
    expect(isLocale('ta')).toBe(false)
    expect(isLocale('')).toBe(false)
    expect(isLocale('EN')).toBe(false)
  })

  it('reports a direction for every shipped locale', () => {
    for (const locale of locales) {
      expect(['ltr', 'rtl']).toContain(localeDirection(locale))
    }
  })
})

describe('market registry', () => {
  it('resolves the default market', () => {
    expect(getMarket().code).toBe(defaultMarket)
    expect(getMarket('IN').name).toBe('India')
  })

  it('gives every market a valid IANA timezone', () => {
    for (const market of Object.values(markets)) {
      // Throws on an unrecognised zone, which is the assertion.
      expect(() =>
        new Intl.DateTimeFormat('en', { timeZone: market.timeZone }).format(new Date(0)),
      ).not.toThrow()
    }
  })

  it('gives every market a currency Intl can format', () => {
    for (const market of Object.values(markets)) {
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: market.currency,
      }).format(1234.5)
      expect(formatted).toMatch(/\d/)
    }
  })

  it('offers only shipped locales in each market', () => {
    for (const market of Object.values(markets)) {
      expect(market.locales.length).toBeGreaterThan(0)
      for (const locale of market.locales) {
        expect(locales).toContain(locale)
      }
    }
  })

  it('gives every market a sane bounding box', () => {
    for (const market of Object.values(markets)) {
      const [west, south, east, north] = market.bounds
      expect(west).toBeGreaterThanOrEqual(-180)
      expect(east).toBeLessThanOrEqual(180)
      expect(south).toBeGreaterThanOrEqual(-90)
      expect(north).toBeLessThanOrEqual(90)
      expect(east).toBeGreaterThan(west)
      expect(north).toBeGreaterThan(south)
    }
  })

  it('uses a numeric dial code without a leading plus', () => {
    for (const market of Object.values(markets)) {
      expect(market.dialCode).toMatch(/^\d{1,4}$/)
    }
  })
})
