import { describe, expect, it } from 'vitest'
import { safeReturnTo } from './return-to'

/**
 * These are the open-redirect cases. A signed-in session plus an attacker-chosen
 * destination is a phishing primitive, so every rejection is asserted explicitly
 * rather than inferred from a browser test.
 */
describe('safeReturnTo', () => {
  it('keeps a same-origin path', () => {
    expect(safeReturnTo('/en/account', 'en')).toBe('/en/account')
    expect(safeReturnTo('/en/search?q=chai', 'en')).toBe('/en/search?q=chai')
  })

  it('falls back to the locale home when absent', () => {
    expect(safeReturnTo(null, 'en')).toBe('/en')
    expect(safeReturnTo(undefined, 'hi')).toBe('/hi')
    expect(safeReturnTo('', 'en')).toBe('/en')
  })

  it('rejects an absolute URL', () => {
    expect(safeReturnTo('https://evil.example/steal', 'en')).toBe('/en')
    expect(safeReturnTo('http://evil.example', 'en')).toBe('/en')
  })

  it('rejects a protocol-relative URL', () => {
    // Browsers treat `//host` as `https://host`.
    expect(safeReturnTo('//evil.example', 'en')).toBe('/en')
    expect(safeReturnTo('//evil.example/path', 'hi')).toBe('/hi')
  })

  it('rejects a backslash-escaped protocol-relative URL', () => {
    expect(safeReturnTo('/\\\\evil.example', 'en')).toBe('/en')
  })

  it('rejects a scheme-relative or javascript target', () => {
    expect(safeReturnTo('javascript:alert(1)', 'en')).toBe('/en')
    expect(safeReturnTo('data:text/html,<script>', 'en')).toBe('/en')
  })
})
