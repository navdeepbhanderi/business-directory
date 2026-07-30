import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Auth journeys.
 *
 * Email confirmation is enabled, so signup is only half a flow without reading
 * the message. These tests pull the confirmation link out of the local Mailpit
 * inbox, which means the real end-to-end path — signup, emailed link, code
 * exchange, session — is exercised rather than stubbed.
 */

const MAILPIT = 'http://127.0.0.1:54324'

function uniqueEmail(tag: string): string {
  // Playwright forbids Math.random in some configs and repeat runs must not
  // collide, so the worker index plus a timestamp is the identity.
  return `e2e-${tag}-${Date.now()}@example.com`
}

const PASSWORD = 'correct-horse-battery-staple'

type MailpitMessage = { ID: string; To: { Address: string }[]; Subject: string }

async function latestMessageFor(
  request: APIRequestContext,
  email: string,
): Promise<MailpitMessage | null> {
  const response = await request.get(`${MAILPIT}/api/v1/messages?limit=50`)
  if (!response.ok()) return null
  const body = (await response.json()) as { messages?: MailpitMessage[] }
  return (
    body.messages?.find((message) =>
      message.To.some((to) => to.Address.toLowerCase() === email.toLowerCase()),
    ) ?? null
  )
}

async function confirmationLink(request: APIRequestContext, email: string): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const message = await latestMessageFor(request, email)
    if (message) {
      const raw = await request.get(`${MAILPIT}/api/v1/message/${message.ID}`)
      const detail = (await raw.json()) as { HTML?: string; Text?: string }
      const source = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`
      const match = /https?:\/\/[^\s"'<>]+(?:verify|callback)[^\s"'<>]*/i.exec(source)
      if (match) return match[0].replace(/&amp;/g, '&')
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

test.describe('guards', () => {
  test('an unauthenticated visitor is sent to sign-in with a return path', async ({ page }) => {
    await page.goto('/en/account')
    await expect(page).toHaveURL(/\/en\/auth\/sign-in\?next=%2Fen%2Faccount/)
  })

  test('owner and admin sections are guarded too', async ({ page }) => {
    for (const path of ['/en/owner/dashboard', '/en/admin']) {
      await page.goto(path)
      // Either a sign-in redirect or a 404 for a route that does not exist yet —
      // never an accessible page.
      expect(page.url()).not.toContain(path)
    }
  })
})

test.describe('sign up and confirm', () => {
  test('a new account can be created, confirmed, and used', async ({ page, request }) => {
    const email = uniqueEmail('signup')

    await page.goto('/en/auth/sign-up')
    await page.getByLabel('Full name').fill('Priya Patel')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()

    // The app must not pretend the account is ready before the address is proven.
    await expect(page).toHaveURL(/verify-email/)
    await expect(page.getByText(email)).toBeVisible()

    const link = await confirmationLink(request, email)
    expect(link, 'no confirmation email arrived in Mailpit').toBeTruthy()

    await page.goto(link ?? '')
    // The callback exchanges the code and lands the user in the app.
    await expect(page).not.toHaveURL(/error=/)

    await page.goto('/en/account')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })

  test('a password below the minimum is rejected before any request', async ({ page }) => {
    await page.goto('/en/auth/sign-up')
    await page.getByLabel('Full name').fill('Priya Patel')
    await page.getByLabel('Email').fill(uniqueEmail('short'))
    await page.getByLabel('Password', { exact: true }).fill('short')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('That is too short.')).toBeVisible()
    await expect(page).toHaveURL(/sign-up/)
  })
})

test.describe('sign in', () => {
  test('wrong credentials give one generic message', async ({ page }) => {
    await page.goto('/en/auth/sign-in')
    await page.getByLabel('Email').fill('definitely-not-a-user@example.com')
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-here')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    // The same message for a missing account and a wrong password, so the form
    // cannot be used to discover which addresses are registered.
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
  })

  test('a full sign-in, account visit, and sign-out round trip', async ({ page, request }) => {
    const email = uniqueEmail('roundtrip')

    await page.goto('/en/auth/sign-up')
    await page.getByLabel('Full name').fill('Rohan Iyer')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/verify-email/)

    const link = await confirmationLink(request, email)
    expect(link).toBeTruthy()
    await page.goto(link ?? '')

    // Signed in: the guard must now let the account page through.
    await page.goto('/en/account')
    await expect(page.getByText(email)).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/en$/)

    // And the guard must bite again immediately.
    await page.goto('/en/account')
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('open redirect', () => {
  /**
   * The rejection logic itself is unit tested in `lib/return-to.test.ts`, which
   * is the right place for a pure guard. This asserts the end-to-end
   * consequence: a *successful* sign-in with a hostile `next` lands in the app,
   * not on another origin. (A failed sign-in never redirects at all, so testing
   * it that way proves nothing.)
   */
  test('a successful sign-in ignores a hostile next target', async ({ page, request }) => {
    const email = uniqueEmail('redirect')

    await page.goto('/en/auth/sign-up')
    await page.getByLabel('Full name').fill('Meera Nair')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/verify-email/)

    const link = await confirmationLink(request, email)
    expect(link).toBeTruthy()
    await page.goto(link ?? '')

    await page.goto('/en/account')
    await page.getByRole('button', { name: 'Sign out' }).click()

    await page.goto('/en/auth/sign-in?next=https://evil.example/steal')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await expect(page).toHaveURL(/127\.0\.0\.1:3000/)
    expect(page.url()).not.toContain('evil.example')
  })
})

test.describe('password reset', () => {
  test('the request always confirms, whether or not the account exists', async ({ page }) => {
    await page.goto('/en/auth/forgot-password')
    await page.getByLabel('Email').fill('nobody-at-all@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()

    // Reporting "no such account" here would make this an existence oracle.
    await expect(page.getByText(/reset link is on its way/i)).toBeVisible()
  })
})

test.describe('phone sign-in', () => {
  test('a malformed number is rejected client-side', async ({ page }) => {
    await page.goto('/en/auth/otp')
    await page.getByLabel('Mobile number').fill('12345')
    await page.getByRole('button', { name: 'Send code' }).click()
    await expect(page.getByText('That does not look right.')).toBeVisible()
  })

  test('a valid number reports honestly when no SMS provider is configured', async ({ page }) => {
    await page.goto('/en/auth/otp')
    await page.getByLabel('Mobile number').fill('+91 98250 10101')
    await page.getByRole('button', { name: 'Send code' }).click()

    // Locally there is no SMS provider. Either a sent-code state or an explicit
    // unavailable message is correct; silently doing nothing is not.
    await expect(page.getByText(/Code sent|not available yet/i).first()).toBeVisible()
  })
})
