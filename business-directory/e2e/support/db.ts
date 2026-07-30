import { createClient } from '@supabase/supabase-js'

/**
 * Service-role access for e2e setup and for asserting what actually landed.
 *
 * Two things this is for, and one it is not:
 *
 *  - Setup: clearing a listing's reviews so a run starts from a known state, and
 *    finding the email of a seeded account so the browser can sign in as it.
 *  - Assertion: reading a row the UI has no page for yet, such as a report
 *    waiting in the moderation queue.
 *
 * It is never used to *perform* the thing under test. Every write in these tests
 * goes through the browser, because the point is that RLS and the triggers allow
 * it for the right person — a service-role write would bypass exactly what is
 * being checked.
 */

const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

export const SEED_PASSWORD = 'demo123456'

export function admin() {
  if (!url || !serviceKey) {
    throw new Error(
      'e2e needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; run `npm run db:start` and check .env.local',
    )
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function emailFor(userId: string): Promise<string> {
  const { data, error } = await admin().auth.admin.getUserById(userId)
  if (error || !data.user?.email) {
    throw new Error(`no email for seeded user ${userId}: ${error?.message ?? 'missing'}`)
  }
  return data.user.email
}

/**
 * An owned, published listing plus the accounts needed to exercise reviews on it.
 *
 * `slot` separates the two Playwright projects: chromium and mobile run in
 * parallel, and both mutate reviews, so each is given a different listing and a
 * different set of people. Sharing them made the two projects fight over the
 * one-review-per-listing constraint.
 */
export async function reviewFixture(slot: number) {
  const db = admin()

  // The service client is untyped (no generated types outside the app), so the
  // shape is asserted once here rather than spreading `any` through the fixture.
  const { data: businessRows, error: businessError } = await db
    .from('businesses')
    .select('id, slug, owner_id')
    .eq('status', 'published')
    .not('owner_id', 'is', null)
    .order('slug')
    .limit(4)
  if (businessError) throw new Error(businessError.message)

  const businesses = (businessRows ?? []) as { id: string; slug: string; owner_id: string | null }[]
  const business = businesses[slot]
  const ownerId = business?.owner_id
  if (!business || !ownerId) throw new Error('no owned published listing in the seed')

  const { data: memberRows, error: memberError } = await db
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'user')
    .neq('id', ownerId)
    .order('created_at')
    .range(slot * 3, slot * 3 + 2)
  if (memberError) throw new Error(memberError.message)

  const members = (memberRows ?? []) as { id: string; full_name: string | null }[]
  const [reviewer, voter, reporter] = members
  if (!reviewer || !voter || !reporter) throw new Error('need three seeded members')

  // Start from zero reviews so the assertions about the average and the count
  // are exact rather than relative. Votes, replies, and reports cascade.
  const { error: clearError } = await db.from('reviews').delete().eq('business_id', business.id)
  if (clearError) throw new Error(clearError.message)

  // The hourly limit is per person, and a repeat run would otherwise inherit the
  // previous run's count.
  await db
    .from('rate_limits')
    .delete()
    .in('user_id', [reviewer.id, voter.id, reporter.id])

  return {
    businessId: business.id,
    slug: business.slug,
    owner: { id: ownerId, email: await emailFor(ownerId) },
    reviewer: { ...reviewer, email: await emailFor(reviewer.id) },
    voter: { ...voter, email: await emailFor(voter.id) },
    reporter: { ...reporter, email: await emailFor(reporter.id) },
  }
}

/**
 * A member with nothing saved, for the favourites and lists journeys.
 *
 * Deliberately uses members from further down the seed than `reviewFixture` does,
 * and only ever deletes lists it created itself (`E2E ` prefix). The seeded lists
 * belong to the first member and the pgTAP suite reads them, so a test that
 * cleared them would leave `npm run db:test` failing depending on the order the
 * two suites happened to run in.
 */
export async function savedFixture(slot: number) {
  const db = admin()

  const { data: memberRows, error: memberError } = await db
    .from('profiles')
    .select('id')
    .eq('role', 'user')
    .order('created_at')
    .range(20 + slot, 20 + slot)
  if (memberError) throw new Error(memberError.message)

  const member = ((memberRows ?? []) as { id: string }[])[0]
  if (!member) throw new Error('need a seeded member past the first twenty')

  const { error: clearFavorites } = await db.from('favorites').delete().eq('user_id', member.id)
  if (clearFavorites) throw new Error(clearFavorites.message)

  const { error: clearLists } = await db
    .from('lists')
    .delete()
    .eq('owner_id', member.id)
    .like('name', 'E2E %')
  if (clearLists) throw new Error(clearLists.message)

  const { data: sharedRows } = await db
    .from('lists')
    .select('name, share_slug')
    .eq('visibility', 'public')
    .not('share_slug', 'is', null)
    .limit(1)
  const shared = ((sharedRows ?? []) as { name: string; share_slug: string }[])[0]
  if (!shared) throw new Error('the seed should contain one public list')

  return {
    member: { id: member.id, email: await emailFor(member.id) },
    /** A list shared in the seed, for the signed-out reader. */
    seededShared: shared,
  }
}
