import { expect, test, type Locator, type Page } from '@playwright/test'
import { SEED_PASSWORD, admin, reviewFixture } from './support/db'

/**
 * The Phase 6 round trip.
 *
 * One review's whole life, driven entirely through the browser: a member writes
 * it, the listing's average moves, the owner replies, a second member votes it
 * helpful, the ordering changes because of that vote, and a third member reports
 * it into the moderation queue.
 *
 * It is a single test on purpose. Each step depends on the last, and splitting it
 * would either re-create the state five times or leave five tests that pass
 * individually and prove nothing together.
 *
 * The service role is used only to set the starting state and to read the report
 * row (there is no moderation page until Phase 9). Every write under test goes
 * through the UI, so RLS and the triggers are what allow it.
 */

/**
 * Choose a star rating the way a person does.
 *
 * The radio itself is `sr-only` — deliberately, so keyboard and screen-reader
 * users get real radio semantics — which means it is not clickable. The visible
 * affordance is the label wrapping the star, so that is what gets clicked.
 */
async function chooseRating(scope: Locator, star: number) {
  await scope.locator(`label:has(input[name="rating"][value="${star}"])`).click()
  await expect(scope.getByRole('radio', { name: new RegExp(`^${star} stars?$`) })).toBeChecked()
}

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

test.describe('review round trip', () => {
  test.describe.configure({ timeout: 180_000 })

  test('written, answered, voted, re-sorted, and reported', async ({ page }, testInfo) => {
    // chromium and mobile run in parallel and both mutate reviews, so each
    // project gets its own listing and its own people.
    const fixture = await reviewFixture(testInfo.project.name === 'mobile' ? 1 : 0)
    const listing = `/en/business/${fixture.slug}`
    const db = admin()

    const firstBody =
      'Went on a Tuesday morning and was seen in ten minutes. The staff explained the charges before anything happened, which is rarer than it should be.'
    const secondBody =
      'Fine for a quick visit but the waiting room was full and nobody said how long it would be. Bring something to read.'
    const replyBody =
      'Thank you for writing this. We have added a second person at the front desk on weekday mornings.'

    // -----------------------------------------------------------------------
    // 1. A member writes a review.
    // -----------------------------------------------------------------------
    await signIn(page, fixture.reviewer.email)
    await page.goto(listing)

    const composer = page.locator('#write-review')
    await expect(composer.getByRole('heading', { name: 'Write a review' })).toBeVisible()

    await chooseRating(composer, 5)
    await composer.getByLabel('Your review').fill(firstBody)
    await composer.getByRole('button', { name: 'Post review' }).click()

    await expect(page.getByText('Thank you — your review is live.')).toBeVisible()

    // -----------------------------------------------------------------------
    // 2. It appears on the listing, and the listing's rating follows it.
    // -----------------------------------------------------------------------
    await page.goto(listing)
    const reviews = page.locator('#reviews')
    await expect(reviews.getByText(firstBody)).toBeVisible()

    // The trigger denormalises the average onto the listing; with one 5-star
    // review the summary must say exactly 5.0 and count one.
    await expect(reviews.getByText('5.0')).toBeVisible()
    await expect(reviews.getByText(/^1 reviews?$/i)).toBeVisible()

    const { data: afterFirst } = await db
      .from('businesses')
      .select('rating, review_count')
      .eq('id', fixture.businessId)
      .single()
    expect(afterFirst?.review_count).toBe(1)
    expect(Number(afterFirst?.rating)).toBe(5)

    // The author is offered an edit rather than a second review.
    await expect(composer.getByRole('heading', { name: 'Edit your review' })).toBeVisible()

    await signOut(page)

    // -----------------------------------------------------------------------
    // 3. The owner replies, publicly.
    // -----------------------------------------------------------------------
    await signIn(page, fixture.owner.email)
    await page.goto(listing)
    await page.getByRole('button', { name: 'Reply as the business' }).first().click()
    await page.getByPlaceholder('Reply publicly').fill(replyBody)
    await page.getByRole('button', { name: 'Post reply' }).click()
    await expect(page.getByText('Reply posted.')).toBeVisible()

    await page.goto(listing)
    await expect(page.getByText('Response from the owner')).toBeVisible()
    await expect(page.getByText(replyBody)).toBeVisible()

    // An owner cannot review their own listing, and is told why.
    await expect(page.getByText('You cannot review a listing you own.')).toBeVisible()

    await signOut(page)

    // -----------------------------------------------------------------------
    // 4. A second member adds a review, then votes the first one helpful.
    // -----------------------------------------------------------------------
    await signIn(page, fixture.voter.email)
    await page.goto(listing)
    await chooseRating(composer, 3)
    await composer.getByLabel('Your review').fill(secondBody)
    await composer.getByRole('button', { name: 'Post review' }).click()
    await expect(page.getByText('Thank you — your review is live.')).toBeVisible()

    await page.goto(listing)
    const rows = page.locator('#reviews li')

    // Newest first: the second review leads.
    await expect(rows.first()).toContainText(secondBody)

    const firstReviewRow = page.locator('#reviews li').filter({ hasText: firstBody })
    await firstReviewRow.getByRole('button', { name: 'Helpful' }).click()
    await expect(firstReviewRow.getByRole('button', { name: 'Helpful' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    /*
     * The button is optimistic — it turns pressed before the insert returns — so
     * pressed state alone does not mean the vote exists. The next assertion is
     * about an ordering that depends on the row being there, so wait for it.
     * Asserting the ordering straight after the click failed exactly this way.
     */
    await expect
      .poll(async () => {
        // Scoped to this listing: the seed gives every member plenty of votes
        // elsewhere, so counting all of theirs proves nothing.
        const { count } = await db
          .from('review_votes')
          .select('review_id, reviews!inner(business_id)', { count: 'exact', head: true })
          .eq('user_id', fixture.voter.id)
          .eq('reviews.business_id', fixture.businessId)
        return count ?? 0
      })
      .toBe(1)

    // -----------------------------------------------------------------------
    // 5. That vote changes the ordering.
    // -----------------------------------------------------------------------
    await page.getByRole('button', { name: 'Most helpful' }).click()
    await expect(page.locator('#reviews li').first()).toContainText(firstBody)

    await page.getByRole('button', { name: 'Newest' }).click()
    await expect(page.locator('#reviews li').first()).toContainText(secondBody)

    await signOut(page)

    // -----------------------------------------------------------------------
    // 6. A third member reports it, and it lands in the moderation queue.
    // -----------------------------------------------------------------------
    await signIn(page, fixture.reporter.email)
    await page.goto(listing)

    const reported = page.locator('#reviews li').filter({ hasText: firstBody })
    await reported.getByRole('button', { name: 'Report' }).click()
    await page.getByLabel('It looks fake or paid for').check()
    await page.getByLabel(/Anything else/).fill('Reads like it was written by the owner.')
    await page.getByRole('button', { name: 'Send report' }).click()
    await expect(page.getByText('Thank you. A moderator will look at this.')).toBeVisible()

    // There is no moderation console until Phase 9, so the queue is checked where
    // it lives: a pending row attributed to the reporter.
    const { data: reports } = await db
      .from('review_reports')
      .select('reason, status, reporter_id, detail')
      .eq('reporter_id', fixture.reporter.id)
    expect(reports).toHaveLength(1)
    expect(reports?.[0]?.reason).toBe('fake')
    expect(reports?.[0]?.status).toBe('pending')
  })
})

test.describe('review rules, through the UI', () => {
  test('a signed-out visitor can write a draft but is asked to sign in to post', async ({
    page,
  }, testInfo) => {
    const fixture = await reviewFixture(testInfo.project.name === 'mobile' ? 3 : 2)
    await page.goto(`/en/business/${fixture.slug}`)

    const composer = page.locator('#write-review')
    await chooseRating(composer, 4)
    await composer.getByLabel('Your review').fill('A draft written before signing in, long enough to be valid.')

    // No post button for a guest — a sign-in link that keeps the draft instead.
    await expect(composer.getByRole('button', { name: 'Post review' })).toHaveCount(0)
    await expect(composer.getByRole('link', { name: 'Sign in to post' })).toBeVisible()

    // And the draft survives the round trip.
    await composer.getByRole('link', { name: 'Sign in to post' }).click()
    await expect(page).toHaveURL(/sign-in/)
    await page.goBack()
    await expect(page.getByText('We restored the draft you started earlier.')).toBeVisible()
    await expect(composer.getByLabel('Your review')).toHaveValue(/draft written before signing in/)
  })

  test('a review below the minimum length cannot be posted', async ({ page }, testInfo) => {
    const fixture = await reviewFixture(testInfo.project.name === 'mobile' ? 3 : 2)
    await signIn(page, fixture.reviewer.email)
    await page.goto(`/en/business/${fixture.slug}`)

    const composer = page.locator('#write-review')
    await chooseRating(composer, 5)
    await composer.getByLabel('Your review').fill('Good')
    await composer.getByRole('button', { name: 'Post review' }).click()

    // The counter warns while typing, and the review does not land.
    await expect(composer.getByText(/of 3000 characters/)).toBeVisible()
    const { data } = await admin()
      .from('reviews')
      .select('id')
      .eq('business_id', fixture.businessId)
    expect(data ?? []).toHaveLength(0)
  })
})
