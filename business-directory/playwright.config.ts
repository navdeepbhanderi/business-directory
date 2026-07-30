import { defineConfig, devices } from '@playwright/test'

// The review tests need the service-role key to set up their starting state and
// to read the moderation queue, which has no page yet. Node loads it natively, so
// this costs no dependency.
try {
  process.loadEnvFile('.env.local')
} catch {
  // CI supplies these as real environment variables.
}

const PORT = 3000
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: baseURL,
    // Always start our own server. Reusing whatever happens to be on the port
    // produced three separate false failures during Phase 2: a server left
    // running from an earlier build kept serving stale client chunks, so
    // hydration never completed and every interactive test failed for a reason
    // that had nothing to do with the code under test.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
