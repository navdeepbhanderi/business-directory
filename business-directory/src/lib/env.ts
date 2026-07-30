import { z } from 'zod'

/**
 * Env is validated at the edge of use, not at module load.
 *
 * Deliberate: `next build` runs without a database reachable (and CI has no
 * secrets), so a top-level `parse()` would break the build gate. Instead each
 * accessor throws a specific, actionable error the moment something actually
 * needs the value.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
})

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
})

function fail(name: string, issue: string): never {
  throw new Error(
    `Environment variable ${name} is ${issue}. Copy .env.example to .env.local and fill it in — ` +
      `run \`npm run db:start\` to get local Supabase credentials.`,
  )
}

export function publicEnv(): z.infer<typeof publicSchema> {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    fail(first?.path.join('.') ?? 'NEXT_PUBLIC_SUPABASE_*', first?.message ?? 'invalid')
  }

  return parsed.data
}

/**
 * Service-role access. Only ever imported by `lib/supabase/admin.ts`, which is
 * server-only — the key must never reach a client bundle.
 */
export function serverEnv(): z.infer<typeof serverSchema> {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    fail(first?.path.join('.') ?? 'SUPABASE_SERVICE_ROLE_KEY', first?.message ?? 'invalid')
  }

  return parsed.data
}

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
