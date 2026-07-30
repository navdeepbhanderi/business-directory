# Openly

**Open hours, honest reviews.**

A business directory and review platform for India — verified listings, opening
hours you can rely on, and reviews from people who actually went.

Built on Next.js 16 and Supabase, with authorization enforced in the database
rather than the app, geospatial + full-text search in a single Postgres
function, and a locale registry designed for India's many languages.

> **Status: Phase 7 complete.** Database, design system, faceted discovery,
> statically generated listing pages (Lighthouse 95/100/100/100), authentication
> with accounts, and reviews — writing, photos, a 24-hour edit window, helpful
> votes, owner replies, and reports into a moderation queue — plus favourites,
> lists with notes and link sharing, and saved searches. Owner tools are next. The
> roadmap lives in **[PLAN.md](./PLAN.md)**.

---

## Why this exists

This replaces a frontend-only prototype that looked complete but was not:
reviews never rendered, search results did not link to listings, favourites were
unreachable dead code, and four of five admin links 404'd. Every one of those
defects is catalogued in [PLAN.md §9](./PLAN.md#9-regression-register) and mapped
to the phase that resolves it, so the rebuild has to prove it fixed them.

## Tech stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | **Next.js 16.2** (App Router, React 19, Turbopack)                |
| Runtime    | **Node 24 LTS** (see `.nvmrc`)                                    |
| Language   | **TypeScript 5** — `strict`, `noUncheckedIndexedAccess`, no `any` |
| Styling    | **Tailwind CSS 4** + CSS custom-property design tokens            |
| Components | Radix primitives, styled entirely on our own token layer          |
| Database   | **Supabase** — Postgres 17, PostGIS, RLS, Auth, Storage           |
| Testing    | **Vitest** (unit), **Playwright** (e2e), **pgTAP** (RLS policies) |
| Hosting    | Vercel + Supabase cloud                                           |

## Getting started

**Prerequisites:** Node 24 (`nvm use`), Docker (for local Supabase).

```bash
nvm use                      # reads .nvmrc
npm install

npm run db:start             # starts local Postgres; prints your keys
cp .env.example .env.local   # paste the keys it printed

npm run dev                  # http://localhost:3000
```

The app redirects `/` to a locale-prefixed path (`/en` or `/hi`) based on your
`Accept-Language` header.

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Dev server                                     |
| `npm run build`     | Production build                               |
| `npm start`         | Serve the production build                     |
| `npm run verify`    | **lint → typecheck → test → build** (the gate) |
| `npm run lint`      | ESLint, zero warnings tolerated                |
| `npm run format`    | Prettier                                       |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run test`      | Vitest unit tests                              |
| `npm run test:e2e`  | Playwright end-to-end tests                    |
| `npm run db:start`  | Start local Supabase                           |
| `npm run db:stop`   | Stop local Supabase                            |
| `npm run db:reset`  | Re-apply every migration from scratch + seed   |
| `npm run db:test`   | pgTAP RLS policy tests                         |
| `npm run db:types`  | Regenerate `src/types/database.ts` from the DB |

Run `npm run verify` before pushing. CI runs the same gate plus the database and
e2e jobs.

## Project structure

```
src/
├── app/
│   ├── [locale]/         # locale-scoped routes; renders <html lang dir>
│   ├── globals.css       # design tokens — the ONLY place raw colors live
│   ├── manifest.ts robots.ts icon.svg
│   └── not-found.tsx
├── components/
│   ├── layout/           # shell, theme
│   ├── directory/        # BusinessCard, RatingStars, OpenNowBadge, HoursTable
│   └── ui/               # Radix-backed primitives on our tokens
├── i18n/
│   ├── config.ts         # locale + market registry
│   ├── negotiate.ts      # Accept-Language resolution (pure, tested)
│   └── dictionaries/     # en, hi — typed against each other
├── lib/
│   ├── supabase/         # public (anon, cacheable) · server · client · admin
│   ├── search-params.ts  # URL-as-state, pure and round-trip tested
│   ├── seo.ts            # JSON-LD builders, unit tested
│   ├── env.ts            # zod-validated, at point of use
│   └── brand.ts          # the one sanctioned hex exception
├── proxy.ts              # locale negotiation (Next 16 middleware convention)
└── types/database.ts     # generated — do not edit
supabase/
├── migrations/           # ordered schema changes
└── tests/                # pgTAP RLS policy tests
e2e/                      # Playwright
```

## Conventions worth knowing

**Colors live in one file.** `src/app/globals.css` holds every token in light and
dark. ESLint fails the build on a raw hex literal anywhere else. The single
exception is `src/lib/brand.ts`, for surfaces that cannot read CSS variables
(PWA manifest, `theme-color`, OG images).

**Translations are type-checked.** Dictionaries are accessed by property
(`dict.home.hero.title`), never by string path. Every locale is typed against
`en`, so a missing or misspelled key is a compile error rather than a silent
fallback to the raw key. Adding a language is one registry entry in
`src/i18n/config.ts` plus one dictionary file.

**Markets are data, not constants.** Timezone, currency, dial code, offered
locales, and map bounds live in the `markets` registry. India is the only market
that ships, but nothing is hardcoded to it.

**Authorization belongs to the database.** Reads go through the cookie-bound
Supabase server client, so RLS applies to every query under the caller's
identity. The service-role client is `server-only`, and importing it from a
Client Component is a build error.

**Public pages read with the anon client, and never the session.** Reading cookies
during render — even through a helper several files deep, even via `searchParams` —
opts a route out of static rendering, which is the SEO argument for the whole
project. Anything viewer-specific on a public page is fetched after mount from a
`private, no-store` endpoint (`/api/review-context` is the worked example) and
treated as presentation only; the database is what actually permits the action.

**RTL is built, not bolted on.** Layout uses logical properties throughout
(`ps-*`, `pe-*`, `ms-*`, `me-*`). No RTL locale ships until Urdu can get native
review — the infrastructure is ready for it.

## Documentation

- **[PLAN.md](./PLAN.md)** — architecture, data model, RLS policy matrix, design
  system, 12-phase roadmap, regression register, quality gates
- **[docs/DESIGN.md](./docs/DESIGN.md)** — palette, typography, RTL rules,
  component inventory, and the non-negotiables
- **[docs/AUTH-SETUP.md](./docs/AUTH-SETUP.md)** — what to configure for Google
  sign-in, production email, and phone OTP (including the Indian DLT registration
  that takes days)
- `docs/SCHEMA.md` — generated in Phase 1

## License

MIT.
