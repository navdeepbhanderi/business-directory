import { expect, test, type Page } from '@playwright/test'
import { SEED_PASSWORD, admin, savedFixture } from './support/db'

/**
 * Favourites, lists, and sharing.
 *
 * The phase's exit criteria, in the order they are claimed: a favourite toggled
 * from a search card, from a map popover, and from a listing page stays in sync
 * across all three and survives a reload; and a shared list opens for a
 * signed-out visitor.
 */

async function signIn(page: Page, email: string) {
  await page.goto('/en/auth/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/sign-in/)
}

async function signOut(page: Page) {
  await page.goto('/en/account')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/en$/)
}

/** The map is beside the list on desktop and behind a button on mobile. */
async function openMap(page: Page, projectName: string) {
  if (projectName === 'mobile') {
    await page.getByRole('button', { name: 'Show map' }).click()
  }
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
}

test.describe('favourites', () => {
  test.describe.configure({ timeout: 120_000 })

  test('a signed-out visitor is offered sign-in rather than a button that fails', async ({
    page,
  }) => {
    await page.goto('/en/search?q=bakery')
    const first = page.locator('article[data-business-id]').first()
    // A link, not a button: the prototype's heart toggled colour and stored
    // nothing, which is worse than not offering it.
    await expect(first.getByRole('link', { name: /^Sign in to save/ })).toBeVisible()
    await expect(first.getByRole('button', { name: /^Save/ })).toHaveCount(0)
  })

  test('a search card and the listing page agree, and it survives a reload', async ({
    page,
  }, testInfo) => {
    const fixture = await savedFixture(testInfo.project.name === 'mobile' ? 1 : 0)
    await signIn(page, fixture.member.email)

    // ---------------------------------------------------------------------
    // 1. From a search card.
    // ---------------------------------------------------------------------
    await page.goto('/en/search?q=bakery')
    const firstCard = page.locator('article[data-business-id]').first()
    const name = (await firstCard.getByRole('heading').innerText()).trim()

    // Addressed by a name that does not change, with `aria-pressed` carrying the
    // state — which is both the correct toggle semantics and the only way to
    // assert on a control that stays the same control after it is pressed.
    const cardSave = firstCard.getByRole('button', { name: `Save: ${name}` })
    await expect(cardSave).toHaveAttribute('aria-pressed', 'false')
    await cardSave.click()
    await expect(cardSave).toHaveAttribute('aria-pressed', 'true')

    // It really landed, not just optimistically.
    await expect
      .poll(async () => {
        const { count } = await admin()
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', fixture.member.id)
        return count ?? 0
      })
      .toBe(1)

    // ---------------------------------------------------------------------
    // 2. It survives a reload, and the listing page agrees.
    // ---------------------------------------------------------------------
    await page.reload()
    await expect(
      page.locator('article[data-business-id]').first().getByRole('button', { name: `Save: ${name}` }),
    ).toHaveAttribute('aria-pressed', 'true')

    const listingHref = await firstCard.getByRole('link', { name }).getAttribute('href')
    await page.goto(listingHref ?? '')
    const listingButton = page.getByRole('button', { name: `Save: ${name}` })
    await expect(listingButton).toHaveAttribute('aria-pressed', 'true')

    // Un-saving here must be visible back on the search page.
    await listingButton.click()
    await expect(listingButton).toHaveAttribute('aria-pressed', 'false')

    await page.goto('/en/search?q=bakery')
    await expect(
      page.locator('article[data-business-id]').first().getByRole('button', { name: `Save: ${name}` }),
    ).toHaveAttribute('aria-pressed', 'false')

    // ---------------------------------------------------------------------
    // 3. And it is in the account page.
    // ---------------------------------------------------------------------
    await cardSave.click()
    await expect(cardSave).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/en/account/saved')
    await expect(page.getByRole('heading', { level: 1, name: 'Saved' })).toBeVisible()
    await expect(page.getByRole('heading', { name })).toBeVisible()
  })

  test('the map popover saves, and the card beside it agrees without a reload', async ({
    page,
  }, testInfo) => {
    const fixture = await savedFixture(testInfo.project.name === 'mobile' ? 5 : 4)
    await signIn(page, fixture.member.email)

    /*
     * A single-result query on purpose. Pins cluster when several sit within 50px
     * of each other, and at the zoom that frames results across India every pin is
     * inside a cluster — so a click on the canvas would hit a cluster and zoom
     * rather than open anything. One result means one pin, centred by `fitBounds`.
     */
    await page.goto('/en/search?q=Iyengar')
    await expect(page.getByText('1 listing', { exact: false })).toBeVisible()

    const card = page.locator('article[data-business-id]').first()
    const name = (await card.getByRole('heading').innerText()).trim()

    await openMap(page, testInfo.project.name)
    const canvas = page.locator('canvas.maplibregl-canvas')
    const box = await canvas.boundingBox()
    expect(box, 'the map canvas should have a size').toBeTruthy()

    /*
     * Retried, because `fitBounds` animates for 400ms after the points arrive and
     * a click landing mid-flight hits the basemap where the pin is about to be.
     * Waiting a fixed time instead would be the same race with better odds.
     */
    const popover = page.getByRole('link', { name: 'View listing' })
    await expect(async () => {
      await canvas.click({
        position: { x: (box?.width ?? 0) / 2, y: (box?.height ?? 0) / 2 },
      })
      await expect(popover).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 20_000 })

    // The popover is scoped explicitly: on a phone the results list is hidden
    // rather than removed, so its own save button is still in the DOM.
    const popoverSave = popover
      .locator('xpath=ancestor::div[contains(@class, "rounded-card")][1]')
      .getByRole('button', { name: `Save: ${name}` })
    await expect(popoverSave).toHaveAttribute('aria-pressed', 'false')
    await popoverSave.click()
    await expect(popoverSave).toHaveAttribute('aria-pressed', 'true')

    await expect
      .poll(async () => {
        const { count } = await admin()
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', fixture.member.id)
        return count ?? 0
      })
      .toBe(1)

    // The claim of this phase: the card for the same listing, on the same page and
    // with no reload, is pressed too — because both read one context rather than
    // keeping their own copy of the answer.
    if (testInfo.project.name === 'mobile') {
      // On a phone the map replaces the list, so it has to be closed to see it.
      await page.getByRole('button', { name: 'Show list' }).click()
    }
    await expect(card.getByRole('button', { name: `Save: ${name}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test.describe('lists', () => {
  test.describe.configure({ timeout: 120_000 })

  test('created from a card, annotated, shared, read by a stranger, then revoked', async ({
    page,
  }, testInfo) => {
    const fixture = await savedFixture(testInfo.project.name === 'mobile' ? 3 : 2)
    const listName = `E2E ${testInfo.project.name} picks`

    await signIn(page, fixture.member.email)
    await page.goto('/en/search?q=bakery')

    const firstCard = page.locator('article[data-business-id]').first()
    const name = (await firstCard.getByRole('heading').innerText()).trim()

    // ---------------------------------------------------------------------
    // 1. Create a list from the card, which adds the listing in one step.
    // ---------------------------------------------------------------------
    await firstCard.getByRole('button', { name: `Add to a list: ${name}` }).click()
    await page.getByLabel('New list').fill(listName)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('button', { name: listName })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.keyboard.press('Escape')

    // ---------------------------------------------------------------------
    // 2. It is on the lists page, with the listing in it.
    // ---------------------------------------------------------------------
    await page.goto('/en/account/lists')
    await page.getByRole('link', { name: new RegExp(listName) }).click()
    await expect(page.getByRole('heading', { level: 1, name: listName })).toBeVisible()
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible()

    // ---------------------------------------------------------------------
    // 3. A note, which is the reason a list is worth sending.
    // ---------------------------------------------------------------------
    const note = 'Ask for the day-old rack, half price after six.'
    await page.getByPlaceholder('Why this one?').fill(note)
    await page.getByRole('button', { name: 'Save note' }).click()
    await expect(page.getByPlaceholder('Why this one?')).toHaveValue(note)

    // ---------------------------------------------------------------------
    // 4. Share it, and read the link that comes back.
    // ---------------------------------------------------------------------
    await page.getByRole('button', { name: 'Share', exact: true }).click()
    const linkField = page.locator('input[readonly]')
    await expect(linkField).toBeVisible()
    const sharePath = await linkField.inputValue()
    expect(sharePath).toMatch(/^\/en\/list\/.+/)

    // ---------------------------------------------------------------------
    // 5. A signed-out stranger holding the link sees the list and the note.
    // ---------------------------------------------------------------------
    await signOut(page)
    await page.goto(sharePath)
    await expect(page.getByRole('heading', { level: 1, name: listName })).toBeVisible()
    await expect(page.getByText(note)).toBeVisible()
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible()

    // ---------------------------------------------------------------------
    // 6. Making it private again revokes the link immediately.
    // ---------------------------------------------------------------------
    await signIn(page, fixture.member.email)
    await page.goto('/en/account/lists')
    await page.getByRole('link', { name: new RegExp(listName) }).click()
    await page.getByRole('button', { name: 'Make private again' }).click()
    await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible()

    await signOut(page)
    const revoked = await page.goto(sharePath)
    expect(revoked?.status(), 'a revoked share link must not resolve').toBe(404)
  })

  test('a list shared in the seed opens for a signed-out visitor', async ({ page }, testInfo) => {
    const fixture = await savedFixture(testInfo.project.name === 'mobile' ? 3 : 2)
    const response = await page.goto(`/en/list/${fixture.seededShared.share_slug}`)

    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: fixture.seededShared.name }),
    ).toBeVisible()
    // Public page, but not one for a search engine: an unlisted list is private
    // by intent even though the URL resolves.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    )
  })

  test('a guessed share slug is a 404, not an empty list', async ({ page }) => {
    const response = await page.goto('/en/list/definitely-not-a-real-slug')
    expect(response?.status()).toBe(404)
  })
})
