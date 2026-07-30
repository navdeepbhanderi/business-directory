import { expect, test, type Page } from '@playwright/test'

/**
 * Shell integrity.
 *
 * The prototype had four of five admin nav links 404, a footer pointing at two
 * pages that did not exist, and a hamburger button with no handler. These tests
 * exist so none of that can come back quietly.
 */

/**
 * Results stream in behind a Suspense boundary, so a bare `count()` can run
 * against the skeleton. Wait for the boundary to resolve — either cards or the
 * empty state — before counting anything.
 */
async function waitForResults(page: Page) {
  await expect(
    page.locator('article').first().or(page.getByText('No listings match those filters')),
  ).toBeVisible({ timeout: 15_000 })
}

test.describe('navigation', () => {
  test('every link in the shell resolves', async ({ page, request }) => {
    await page.goto('/en')

    const hrefs = await page
      .locator('header a, footer a')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.getAttribute('href'))
          .filter((href): href is string => href !== null && href.startsWith('/')),
      )

    // Sanity: if the selector stops matching, the test must fail loudly rather
    // than pass by checking nothing.
    expect(hrefs.length).toBeGreaterThan(4)

    const dead: string[] = []
    for (const href of new Set(hrefs)) {
      const response = await request.get(href)
      if (response.status() >= 400) dead.push(`${href} → ${response.status()}`)
    }
    expect(dead).toEqual([])
  })

  test('mobile navigation opens, navigates, and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/en')

    const trigger = page.getByRole('button', { name: 'Open menu' })
    await expect(trigger).toBeVisible()
    await trigger.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('link', { name: 'Search' }).click()
    await expect(page).toHaveURL(/\/en\/search/)
    // The sheet must close on navigation; Next's client router will not unmount it.
    await expect(dialog).toBeHidden()
  })

  test('the header search reaches results', async ({ page }) => {
    await page.goto('/en')
    await page
      .getByPlaceholder(/Search restaurants/i)
      .first()
      .fill('bakery')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/en\/search\?q=bakery/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('bakery')
  })

  test('language switcher preserves the current page and query', async ({ page }) => {
    await page.goto('/en/search?q=bakery')
    await page.getByRole('button', { name: 'Switch language' }).click()
    await page.getByRole('menuitem', { name: 'हिन्दी' }).click()
    await expect(page).toHaveURL(/\/hi\/search\?q=bakery/)
  })
})

test.describe('discovery journey', () => {
  test('a visitor can search, open a listing, and see real detail', async ({ page }) => {
    await page.goto('/en/search?q=bakery')
    await waitForResults(page)

    const firstCard = page.locator('article').first()
    await expect(firstCard).toBeVisible()
    const name = await firstCard.getByRole('heading').textContent()

    // Regression #2: the prototype's result cards had no click handler at all.
    await firstCard.getByRole('link').first().click()
    await expect(page).toHaveURL(/\/en\/business\//)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name?.trim() ?? '')
    await expect(page.getByText('Opening hours')).toBeVisible()
  })

  test('category browse from the home page filters results', async ({ page }) => {
    await page.goto('/en')
    // Regression #3: home wrote `?category=`, search read `categoryIds`, and the
    // mount effect then nulled it — so category browse silently showed everything.
    await page.getByRole('link', { name: 'Street Food & Chaat' }).first().click()
    await expect(page).toHaveURL(/category=street-food/)
    await waitForResults(page)

    const count = await page.locator('article').count()
    expect(count).toBeGreaterThan(0)
    await expect(page.getByText('Street Food & Chaat').first()).toBeVisible()
  })

  test('sort links change the ordering and stay shareable', async ({ page }) => {
    await page.goto('/en/search')
    await page.getByRole('link', { name: 'Highest rated' }).click()
    await expect(page).toHaveURL(/sort=rating/)
    await waitForResults(page)

    const ratings = await page
      .locator('article .num')
      .evaluateAll((nodes) =>
        nodes
          .map((n) => Number.parseFloat(n.textContent ?? ''))
          .filter((v) => Number.isFinite(v) && v <= 5),
      )
    const firstFew = ratings.slice(0, 4)
    const sorted = [...firstFew].sort((a, b) => b - a)
    expect(firstFew).toEqual(sorted)
  })

  test('pagination moves through pages', async ({ page }) => {
    await page.goto('/en/search')
    await waitForResults(page)
    const next = page.locator('a[rel="next"]')
    await expect(next).toBeVisible()
    await next.click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('an impossible filter combination shows a real empty state', async ({ page }) => {
    await page.goto('/en/search?q=zzzznotathing')
    await expect(page.getByText('No listings match those filters')).toBeVisible()
    // Empty states must offer a way out, not just state the problem.
    await expect(page.getByRole('link', { name: 'Clear all filters' })).toBeVisible()
  })
})

test.describe('accessibility basics', () => {
  test('the skip link is reachable and targets main', async ({ page }) => {
    await page.goto('/en')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await expect(skip).toHaveAttribute('href', '#main')
    await expect(page.locator('#main')).toBeAttached()
  })

  test('exactly one h1 per page', async ({ page }) => {
    for (const path of ['/en', '/en/search', '/en/about', '/en/guidelines']) {
      await page.goto(path)
      await expect(page.locator('h1'), `h1 count on ${path}`).toHaveCount(1)
    }
  })

  test('every listing image has an alt attribute', async ({ page }) => {
    await page.goto('/en/search?q=bakery')
    await waitForResults(page)
    const missing = await page
      .locator('img')
      .evaluateAll((nodes) => nodes.filter((n) => !n.hasAttribute('alt')).length)
    expect(missing).toBe(0)
  })
})
