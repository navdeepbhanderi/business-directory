import { expect, test } from '@playwright/test'

test.describe('scaffold', () => {
  test('redirects the bare root to a locale-prefixed URL', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/(en|hi)$/)
  })

  test('renders the English home page with the correct lang and direction', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('renders the Hindi home page in Devanagari', async ({ page }) => {
    await page.goto('/hi')
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN')
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    // Asserts the dictionary actually swapped, not just the URL.
    await expect(heading).toHaveText(/[ऀ-ॿ]/)
  })

  test('language switcher moves between locales', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: 'Switch language' }).click()
    await page.getByRole('menuitem', { name: 'हिन्दी' }).click()
    await expect(page).toHaveURL(/\/hi$/)
  })

  test('rejects an unsupported locale segment with a 404', async ({ page }) => {
    const response = await page.goto('/fr')
    expect(response?.status()).toBe(404)
  })

  test('serves a designed 404 for unknown paths', async ({ page }) => {
    const response = await page.goto('/en/this-route-does-not-exist')
    expect(response?.status()).toBe(404)
  })

  test('sets the security headers from next.config', async ({ page }) => {
    const response = await page.goto('/en')
    const headers = response?.headers() ?? {}
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('dark mode toggles and survives a reload', async ({ page }) => {
    await page.goto('/en')
    const html = page.locator('html')
    const wasDark = await html.evaluate((el) => el.classList.contains('dark'))

    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect.poll(() => html.evaluate((el) => el.classList.contains('dark'))).toBe(!wasDark)

    await page.reload()
    // ThemeScript must restore the choice before paint.
    await expect.poll(() => html.evaluate((el) => el.classList.contains('dark'))).toBe(!wasDark)
  })
})
