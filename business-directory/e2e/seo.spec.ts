import { expect, test, type Page } from '@playwright/test'

/**
 * SEO surface.
 *
 * Rich results and canonicals fail silently — no error, just no stars in search
 * and duplicate-content penalties nobody notices for months. So each guarantee
 * is asserted against the rendered HTML.
 */

const LISTING = '/en/business/iyengar-bakery-bengaluru'

async function jsonLdGraph(page: Page): Promise<Record<string, unknown>[]> {
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(raw, 'no JSON-LD on the page').toBeTruthy()
  const parsed = JSON.parse(raw ?? '{}') as {
    '@context': string
    '@graph': Record<string, unknown>[]
  }
  expect(parsed['@context']).toBe('https://schema.org')
  return parsed['@graph']
}

test.describe('structured data', () => {
  test('a listing emits LocalBusiness with the fields rich results require', async ({ page }) => {
    await page.goto(LISTING)
    const graph = await jsonLdGraph(page)

    const business = graph.find((node) => node['@type'] === 'LocalBusiness')
    expect(business, 'no LocalBusiness node').toBeTruthy()

    for (const field of ['name', 'url', '@id', 'address']) {
      expect(business?.[field], `LocalBusiness.${field}`).toBeTruthy()
    }

    const address = business?.['address'] as Record<string, string>
    for (const field of ['streetAddress', 'addressLocality', 'addressCountry']) {
      expect(address[field], `address.${field}`).toBeTruthy()
    }

    expect(business?.['geo']).toMatchObject({ '@type': 'GeoCoordinates' })
    expect(business?.['openingHoursSpecification']).toBeTruthy()
  })

  test('AggregateRating is present and within bounds', async ({ page }) => {
    await page.goto(LISTING)
    const graph = await jsonLdGraph(page)
    const business = graph.find((node) => node['@type'] === 'LocalBusiness')
    const rating = business?.['aggregateRating'] as Record<string, number> | undefined

    expect(rating, 'no aggregateRating').toBeTruthy()
    // Google rejects a zero reviewCount, and a rejected block can invalidate
    // the surrounding graph.
    expect(rating?.['reviewCount']).toBeGreaterThan(0)
    expect(rating?.['ratingValue']).toBeGreaterThanOrEqual(1)
    expect(rating?.['ratingValue']).toBeLessThanOrEqual(5)
    expect(rating?.['bestRating']).toBe(5)
  })

  test('individual Review nodes and a BreadcrumbList are present', async ({ page }) => {
    await page.goto(LISTING)
    const graph = await jsonLdGraph(page)
    expect(graph.filter((node) => node['@type'] === 'Review').length).toBeGreaterThan(0)

    const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList')
    const items = crumbs?.['itemListElement'] as { position: number; item: string }[]
    expect(items[0]?.position).toBe(1)
    expect(items[0]?.item).toMatch(/^https?:\/\//)
  })

  test('the payload cannot break out of its script tag', async ({ page }) => {
    await page.goto(LISTING)
    const raw =
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? ''
    // A business name is owner-controlled; unescaped `<` would end the element.
    expect(raw).not.toContain('</script')
    expect(raw).not.toContain('<')
  })

  test('there is exactly one JSON-LD block, so validators cannot pick the wrong one', async ({
    page,
  }) => {
    await page.goto(LISTING)
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  })
})

test.describe('metadata', () => {
  test('canonical is absolute and self-referencing', async ({ page }) => {
    await page.goto(LISTING)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toMatch(/^https?:\/\//)
    expect(canonical).toContain('/en/business/iyengar-bakery-bengaluru')
  })

  test('hreflang covers both locales plus x-default', async ({ page }) => {
    await page.goto(LISTING)
    const links = page.locator('link[rel="alternate"]')
    const langs = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('hreflang')),
    )
    expect(langs).toContain('en-IN')
    expect(langs).toContain('hi-IN')
    expect(langs).toContain('x-default')
  })

  test('the Hindi listing canonicalises to itself, not to English', async ({ page }) => {
    await page.goto('/hi/business/iyengar-bakery-bengaluru')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain('/hi/business/')
  })

  test('title and description are listing-specific', async ({ page }) => {
    await page.goto(LISTING)
    await expect(page).toHaveTitle(/Iyengar Bakery/)
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description).toContain('Iyengar Bakery')
    expect(description?.length ?? 0).toBeGreaterThan(50)
  })

  test('the OG image resolves and is a real PNG', async ({ page, request }) => {
    await page.goto(LISTING)
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toBeTruthy()

    // Regression guard: hardcoding `.../opengraph-image` 404s, because Next
    // serves the file convention from a content-hashed route.
    const response = await request.get(ogImage ?? '')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    expect((await response.body()).byteLength).toBeGreaterThan(5_000)
  })
})

test.describe('sitemap and robots', () => {
  test('the sitemap is valid XML listing every published business', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)

    const xml = await response.text()
    expect(xml).toContain('<urlset')

    const listings = xml.match(/\/business\//g) ?? []
    // 100 published listings in the seed. Asserting a floor rather than an exact
    // number so adding seed data does not fail the test spuriously.
    expect(listings.length).toBeGreaterThanOrEqual(100)
  })

  test('sitemap entries carry hreflang alternates', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toContain('xhtml:link')
    expect(xml).toContain('hreflang="hi"')
  })

  test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toContain('Allow: /')
    expect(body).toContain('Sitemap:')
  })
})

test.describe('listing content', () => {
  test('contact actions are real links, not inert buttons', async ({ page }) => {
    await page.goto(LISTING)

    // Regression #21: the prototype rendered these under "Demo only" tooltips.
    const tel = page.locator('a[href^="tel:"]')
    await expect(tel.first()).toBeVisible()
    expect(await tel.first().getAttribute('href')).toMatch(/^tel:\+?\d+$/)

    const directions = page.locator('a[href*="google.com/maps"]')
    await expect(directions.first()).toBeVisible()

    await expect(page.getByText('Demo only')).toHaveCount(0)
  })

  test('the gallery opens a lightbox and closes on Escape', async ({ page }) => {
    await page.goto(LISTING)
    await page
      .getByRole('button', { name: /View photo$/ })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  // Uses a listing known to have neighbours rather than the shared fixture:
  // the section is legitimately absent when nothing is within the radius, and a
  // test that hardcodes one slug tests that row rather than the feature.
  test('nearby listings are present and link onward', async ({ page }) => {
    await page.goto('/en/business/anand-bhavan-pure-veg-delhi')
    const nearby = page.getByRole('heading', { name: 'Nearby', exact: true })
    await expect(nearby).toBeVisible()

    const first = page.locator('article').first()
    await first.getByRole('link').first().click()
    await expect(page).toHaveURL(/\/en\/business\//)
  })

  test('an unknown slug 404s rather than rendering an empty shell', async ({ page }) => {
    const response = await page.goto('/en/business/not-a-real-listing')
    expect(response?.status()).toBe(404)
  })
})
