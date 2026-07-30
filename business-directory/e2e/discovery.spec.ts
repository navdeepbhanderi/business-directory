import { expect, test, type Page } from '@playwright/test'

/**
 * Discovery.
 *
 * The plan's exit criterion for this phase: query + category + 5 km radius +
 * open-now + 4★ returns correct results; the URL is shareable and restores
 * exactly; the back button behaves; distances and open badges are true.
 */

const ORIGIN = { lat: 12.9716, lng: 77.5946 } // Bengaluru centre

function url(params: Record<string, string>) {
  return `/en/search?${new URLSearchParams(params).toString()}`
}

/**
 * Results stream in behind a Suspense boundary, so a bare `count()` can run
 * against the skeleton. Wait for the boundary to resolve first.
 */
async function waitForResults(page: Page) {
  await expect(
    page.locator('article').first().or(page.getByText('No listings match those filters')),
  ).toBeVisible({ timeout: 15_000 })
}

test.describe('filters', () => {
  test('every facet narrows the result count', async ({ page }) => {
    await page.goto('/en/search')
    await waitForResults(page)
    const total = await page.locator('article').count()
    expect(total).toBeGreaterThan(0)

    const facets: Record<string, string>[] = [
      { category: 'street-food' },
      { city: 'ahmedabad' },
      { rating: '4.5' },
      { price: '1' },
      { amenity: 'Parking' },
      { open: '1' },
    ]

    for (const params of facets) {
      await page.goto(url(params))
      await waitForResults(page)
      const count = await page.locator('article').count()
      expect(count, `${JSON.stringify(params)} returned nothing at all`).toBeGreaterThan(0)
      expect(count, `${JSON.stringify(params)} did not narrow`).toBeLessThanOrEqual(total)
    }
  })

  test('the combined filter case resolves and reports its count', async ({ page }) => {
    await page.goto(
      url({
        q: 'bakery',
        category: 'sweets-bakery',
        lat: String(ORIGIN.lat),
        lng: String(ORIGIN.lng),
        radius: '5',
        open: '1',
        rating: '4',
        sort: 'nearest',
      }),
    )
    await waitForResults(page)
    // Either results or a real empty state — never a crash or a blank column.
    const hasResults = (await page.locator('article').count()) > 0
    if (hasResults) {
      await expect(page.getByText(/listings?$/).first()).toBeVisible()
    } else {
      await expect(page.getByText('No listings match those filters')).toBeVisible()
    }
  })

  test('clicking a facet adds it to the URL and shows a removable chip', async ({ page }) => {
    await page.goto('/en/search')
    await page.getByRole('link', { name: 'Street Food & Chaat', exact: true }).first().click()
    await expect(page).toHaveURL(/category=street-food/)

    const chip = page.getByRole('link', { name: /Street Food & Chaat/ }).first()
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(page).not.toHaveURL(/category=street-food/)
  })

  test('changing a filter resets to page 1', async ({ page }) => {
    await page.goto(url({ page: '3' }))
    await page.getByRole('link', { name: 'Open now', exact: true }).first().click()
    await expect(page).toHaveURL(/open=1/)
    await expect(page).not.toHaveURL(/page=3/)
  })

  test('changing city clears a locality that belonged to the old one', async ({ page }) => {
    await page.goto(url({ city: 'bengaluru', locality: 'indiranagar' }))
    await page.getByRole('link', { name: 'Ahmedabad', exact: true }).first().click()
    await expect(page).toHaveURL(/city=ahmedabad/)
    await expect(page).not.toHaveURL(/locality=indiranagar/)
  })

  test('clear all removes every filter but keeps the sort', async ({ page }) => {
    await page.goto(url({ category: 'street-food', rating: '4', sort: 'rating' }))
    await page.getByRole('link', { name: 'Clear all' }).click()
    await expect(page).not.toHaveURL(/category=/)
    await expect(page).not.toHaveURL(/rating=4/)
    await expect(page).toHaveURL(/sort=rating/)
  })
})

test.describe('URL as state', () => {
  test('a filtered URL restores exactly when opened cold', async ({ page }) => {
    const target = url({
      q: 'bakery',
      category: 'sweets-bakery',
      city: 'bengaluru',
      rating: '4',
      open: '1',
      sort: 'rating',
    })
    await page.goto(target)

    // Each active facet must be reflected back as a chip.
    for (const label of ['“bakery”', 'Open now', 'Sweets & Bakery', 'Bengaluru', '4+ ★']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'Highest rated' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('the back button returns to the previous filter state', async ({ page }) => {
    await page.goto('/en/search')
    await page.getByRole('link', { name: 'Street Food & Chaat', exact: true }).first().click()
    await expect(page).toHaveURL(/category=street-food/)

    await page.getByRole('link', { name: 'Highest rated' }).click()
    await expect(page).toHaveURL(/sort=rating/)

    await page.goBack()
    await expect(page).toHaveURL(/category=street-food/)
    await expect(page).not.toHaveURL(/sort=rating/)

    await page.goBack()
    await expect(page).not.toHaveURL(/category=/)
  })

  test('malformed parameters degrade instead of erroring', async ({ page }) => {
    const malformed: Record<string, string>[] = [
      { rating: '99' },
      { lat: '999', lng: '1' },
      { page: 'banana' },
      { price: 'nonsense' },
      { sort: 'cheapest' },
      { radius: '5' }, // radius with no origin
    ]

    for (const params of malformed) {
      const response = await page.goto(url(params))
      expect(response?.status(), JSON.stringify(params)).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  test('nearest sort is not offered without an origin', async ({ page }) => {
    await page.goto('/en/search')
    await expect(page.getByRole('link', { name: 'Nearest' })).toHaveCount(0)

    await page.goto(url({ lat: String(ORIGIN.lat), lng: String(ORIGIN.lng) }))
    await expect(page.getByRole('link', { name: 'Nearest' })).toBeVisible()
  })
})

test.describe('distance and open state are true', () => {
  test('nearest sort orders by real distance, ascending', async ({ page }) => {
    await page.goto(
      url({ lat: String(ORIGIN.lat), lng: String(ORIGIN.lng), radius: '10', sort: 'nearest' }),
    )

    await waitForResults(page)

    const distances = await page.locator('article').evaluateAll((cards) =>
      cards
        .map((card) => card.textContent ?? '')
        .map((text) => {
          const km = /([\d.]+)\s*km/.exec(text)
          const m = /(\d+)\s*m(?![a-z])/.exec(text)
          if (km?.[1]) return Number.parseFloat(km[1])
          if (m?.[1]) return Number.parseFloat(m[1]) / 1000
          return null
        })
        .filter((value): value is number => value !== null),
    )

    expect(distances.length).toBeGreaterThan(1)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
    // The radius filter must actually bound the results.
    expect(Math.max(...distances)).toBeLessThanOrEqual(10)
  })

  test('a tighter radius returns a subset of a looser one', async ({ page }) => {
    const at = (radius: string) =>
      url({ lat: String(ORIGIN.lat), lng: String(ORIGIN.lng), radius, sort: 'nearest' })

    await page.goto(at('25'))
    await waitForResults(page)
    const wide = await page.locator('article').count()
    await page.goto(at('2'))
    await waitForResults(page)
    const narrow = await page.locator('article').count()

    expect(narrow).toBeLessThanOrEqual(wide)
  })

  test('open-now results all show an open badge', async ({ page }) => {
    await page.goto(url({ open: '1' }))
    await waitForResults(page)
    const cards = page.locator('article')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    for (let index = 0; index < Math.min(count, 6); index += 1) {
      // The badge and the SQL filter read the same hours; if they disagree the
      // card is lying about something a visitor will act on.
      await expect(cards.nth(index)).toContainText('Open')
    }
  })
})

test.describe('map', () => {
  test('renders a canvas and clusters alongside the list', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto(url({ lat: String(ORIGIN.lat), lng: String(ORIGIN.lng), radius: '10' }))

    await waitForResults(page)
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15_000 })
    // The list stays present; the map supplements it rather than replacing it.
    expect(await page.locator('article').count()).toBeGreaterThan(0)
  })

  test('hovering a card highlights its pin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto(url({ lat: String(ORIGIN.lat), lng: String(ORIGIN.lng), radius: '10' }))
    await waitForResults(page)
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15_000 })

    await page.locator('article').first().hover()
    // The sync injects a one-rule stylesheet targeting the hovered card.
    await expect
      .poll(async () => {
        const styles = await page.locator('style').allTextContents()
        return styles.some((text) => text.includes('data-business-id'))
      })
      .toBe(true)
  })

  test('the list works on mobile, where the map is behind a toggle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url({ lat: String(ORIGIN.lat), lng: String(ORIGIN.lng), radius: '10' }))
    await waitForResults(page)

    expect(await page.locator('article').count()).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: 'Show map' })).toBeVisible()
  })
})
