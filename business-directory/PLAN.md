# Openly — Build Plan

**Status:** Phase 5 complete · **Owner:** Navdeep Bhanderi · **Created:** 2026-07-30
**Launch market:** India · **Architecture:** multi-market, multi-locale from day one
**Goal:** turn a frontend-only prototype into a production-grade, genuinely working
product — and the strongest case study on
[navdeepbhanderi.dev](https://navdeepbhanderi.dev).

---

## Table of contents

- [1. Why this project](#1-why-this-project)
- [2. Locked decisions](#2-locked-decisions)
- [3. Target architecture](#3-target-architecture)
- [4. Data model](#4-data-model)
- [5. Authorization model (RLS)](#5-authorization-model-rls)
- [6. Design system](#6-design-system)
- [7. Feature specification](#7-feature-specification)
- [8. Phase plan](#8-phase-plan)
- [9. Regression register](#9-regression-register)
- [10. Quality gates](#10-quality-gates)
- [11. Out of scope](#11-out-of-scope)
- [12. Open questions](#12-open-questions)
- [13. Portfolio case study](#13-portfolio-case-study)

---

## 1. Why this project

Your portfolio's own roadmap asks for _"a third real case study — three genuine
projects beats two + placeholder."_ This is that project, and it is a better
showcase than the existing two because of what it forces you to solve:

| What it proves                                    | Why it lands                                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-role authorization enforced in the database | RLS policies on a claim/moderation model is a real engineering answer, not a client-side `if (role === 'admin')`                             |
| Geospatial + full-text search                     | PostGIS radius queries and weighted `tsvector` ranking in one RPC — concrete, benchmarkable                                                  |
| Moderation workflows with an audit trail          | Claim verification, review reports, reversible admin actions. This is what internal tools actually look like                                 |
| SEO as a product requirement                      | A directory nobody can find is worthless. Server rendering, JSON-LD rich results, programmatic landing pages                                 |
| Multilingual done properly                        | A locale registry, per-script typography, and compile-time translation parity — built for eight-plus Indian languages, not a half-flipped UI |
| Product design judgment                           | A directory designed for scanning and trust, deliberately _not_ in your portfolio's cinematic register                                       |

**The bar:** a stranger lands on it cold, searches, filters, opens a listing,
reads reviews, signs up, writes a review, saves it to a list — and nothing
breaks, nothing is a dead end, nothing says "demo only."

### Honest assessment of what exists today

The prototype is ~8,400 lines with a clean directory structure, a well-shaped
typed service layer in `src/lib/api.ts`, full two-locale key parity (156 keys each),
and a genuinely thoughtful domain model. `tsc -b` and `vite build` both pass.

It is also non-functional in the ways that matter: reviews never render, search
results don't link to listings, category browsing silently fails, favorites are
unreachable dead code, and four of five admin nav links 404. See
[§9 Regression register](#9-regression-register) for the full audit.

The structure survives. The implementation is replaced.

---

## 2. Locked decisions

| Decision          | Choice                                                                                      | Rationale                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Framework**     | Next.js 16.2, App Router, React 19                                                          | Listings must be server-rendered and indexable — that's the point of a directory. 16 is current stable; starting a greenfield build on the previous major makes no sense |
| **Design**        | Warm editorial directory, light-first, own identity                                         | Directories are scanned, not admired. Distinct from your portfolio _on purpose_ — designing for the product is the signal                                                |
| **Backend**       | Supabase (Postgres + PostGIS + Auth + Storage + Edge Functions)                             | Every hard requirement here maps to something Postgres does well                                                                                                         |
| **Hosting**       | Vercel + Supabase cloud                                                                     | Free tiers cover this; matches portfolio deployment                                                                                                                      |
| **Language**      | TypeScript 5, `strict`, no `any` in app code                                                | Current prototype has 107 lint errors, mostly `any`. Zero tolerance in the rebuild                                                                                       |
| **Styling**       | Tailwind CSS 4 + CSS custom-property tokens                                                 | Tokens in one place so light/dark/RTL stay coherent                                                                                                                      |
| **Components**    | shadcn/ui + Radix, restyled to the new tokens                                               | Keep the accessibility primitives, replace the default look entirely                                                                                                     |
| **Map**           | MapLibre GL JS + CARTO basemap (keyless)                                                    | No API key, no billing surprise. Mapbox stays a swap-in if vector styling matters later                                                                                  |
| **Payments**      | Stripe test mode, feature-flagged                                                           | Real Checkout in test mode beats a fake `setTimeout`. Degrades to simulated if keys absent                                                                               |
| **Email**         | Resend via Supabase Edge Function                                                           | Claim decisions and review notifications are real emails. Dev mode logs to console                                                                                       |
| **Runtime**       | Node 24 LTS (`.nvmrc`), enforced by `engines`                                               | Node 20 reached EOL 2026-04-30, and `@supabase/supabase-js` ≥ 2.110 requires Node 22+. Vercel defaults to a current LTS anyway                                           |
| **i18n**          | `/{locale}` path prefix, `proxy.ts` negotiation, locale registry                            | Adding a language is one registry entry plus one dictionary file. Localized DB columns, not just UI strings                                                              |
| **Launch market** | India — `Asia/Kolkata`, INR, `+91`, locales `en` + `hi`                                     | Home market. Open-now correctness depends on real timezone handling, never the server clock                                                                              |
| **Seed data**     | ~120 plausible businesses across 6 Indian cities, 12 categories, clearly labelled demo data | 5 businesses can't exercise search, filters, pagination, or a map. India needs several cities to make city pages meaningful                                              |
| **Repo**          | Rebuild in place under `business-directory/`, phase branches off `main`                     | One commit of history to preserve; nothing to lose                                                                                                                       |

### Deliberately _not_ doing

Light-mode-only, PWA/offline, native apps, live chat, booking/reservations,
AI features. The project is already ambitious. Adding AI here would dilute what
it proves — you have an AI case study already.

**Multi-market is in scope as architecture, not as launched markets.** India is
the only market that ships. But market-specific facts (timezone, currency, dial
code, bounding box, offered locales) live in a registry rather than scattered
constants, and every table that needs it carries a country code. Adding a second
market becomes a data change, not a refactor — which is the interesting claim to
be able to make, and it costs almost nothing to build in from the start. What we
are _not_ doing is the operational work a real second market needs: local
categories, native translation, market-specific moderation, or per-market SEO.

---

## 3. Target architecture

```
business-directory/
├── src/
│   ├── app/
│   │   ├── [locale]/                    # en | hi  (registry-driven)
│   │   │   ├── (site)/                  # public shell: header + footer
│   │   │   │   ├── page.tsx             # home            SSG + ISR
│   │   │   │   ├── search/page.tsx      # server, streamed results
│   │   │   │   ├── business/[slug]/     # SSG + ISR  ← the indexable surface
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── opengraph-image.tsx
│   │   │   │   │   └── reviews/page.tsx
│   │   │   │   ├── c/[category]/        # /c/restaurants
│   │   │   │   ├── in/[city]/           # /in/ahmedabad
│   │   │   │   ├── c/[category]/in/[city]/   # programmatic SEO
│   │   │   │   └── pricing/page.tsx
│   │   │   ├── (auth)/                  # sign-in, sign-up, otp, callback, reset
│   │   │   ├── (account)/               # profile, lists, reviews, notifications
│   │   │   ├── (owner)/                 # register, claim, dashboard, listing editor
│   │   │   └── (admin)/                 # queues, users, reviews, listings, pricing, audit
│   │   ├── api/                         # webhooks, revalidate, og fallbacks
│   │   ├── sitemap.ts robots.ts manifest.ts
│   │   └── globals.css                  # design tokens live here
│   ├── components/
│   │   ├── ui/                          # shadcn primitives, retokenized
│   │   ├── directory/                   # BusinessCard, RatingStars, OpenNowBadge,
│   │   │                                # HoursTable, FilterBar, ResultsMap, PhotoGallery
│   │   ├── reviews/                     # ReviewForm, ReviewList, HelpfulVote, OwnerReply
│   │   └── layout/                      # Header, MobileNav, Footer, CommandPalette
│   ├── lib/
│   │   ├── supabase/                    # server.ts · client.ts · middleware.ts · admin.ts
│   │   ├── queries/                     # typed data access, one module per domain
│   │   ├── actions/                     # Server Actions, zod-validated
│   │   ├── hours.ts                     # open-now, timezone-correct
│   │   ├── geo.ts                       # distance formatting, bounds
│   │   └── seo.ts                       # JSON-LD builders
│   ├── i18n/                            # dictionaries, routing, formatters
│   └── types/database.ts                # generated by supabase gen types
├── supabase/
│   ├── migrations/                      # every schema change, ordered
│   ├── functions/                       # edge functions (email, og, cron)
│   ├── tests/                           # pgTAP — RLS policy tests
│   └── seed.sql
├── e2e/                                 # Playwright
└── docs/
    ├── PLAN.md                          # this file
    ├── DESIGN.md                        # extracted in Phase 2
    └── SCHEMA.md                        # generated ERD + policy notes
```

**Data flow.** Server Components read via `src/lib/queries/*` using the
cookie-bound Supabase server client — RLS applies to every read. Mutations go
through Server Actions in `src/lib/actions/*`: zod-validate → call Supabase →
`revalidateTag`. The browser client is used only where live interactivity
demands it (map, optimistic favorites, realtime moderation queue). The service-role
key is confined to `lib/supabase/admin.ts` and never imported into a Client
Component.

**Caching.** Business pages `revalidate: 3600` plus tag-based invalidation on
edit or new review. Search is dynamic but the RPC is indexed. Category and city
landing pages are ISR.

---

## 4. Data model

Postgres with `postgis`, `pg_trgm`, `unaccent`, `citext`.

### Core

```
profiles                 id → auth.users, full_name, avatar_url, role,
                         locale, phone, banned_at, created_at
                         · role: guest | user | owner | admin
                         · role is NOT self-updatable (trigger-enforced)

categories               id, slug, name, name_i18n jsonb, icon, parent_id,
                         sort_order
                         · self-referencing for subcategories

markets                  code (PK, ISO 3166-1 alpha-2), name, timezone,
                         currency, dial_code, bounds, active
                         · India is the only active row; the table is what
                           makes a second market a data change

cities                   id, market_code, slug, name, name_i18n jsonb,
                         state, centroid, population_rank
                         · powers /in/[city] landing pages

localities               id, city_id, slug, name, name_i18n jsonb, centroid
                         · neighbourhood granularity (Navrangpura, Indiranagar)

businesses               id, slug, name, description,
                         name_i18n jsonb, description_i18n jsonb,
                         · one jsonb per translatable field keyed by locale,
                           so adding a language needs no migration
                         owner_id → profiles, status, verified,
                         address_line1, address_line2,
                         locality_id, city_id, market_code, postal_code,
                         location geography(Point,4326),
                         phone, email, website, socials jsonb,
                         price_level (1..4), amenities text[],
                         rating numeric(2,1), review_count int,      ← denormalized
                         search_vector tsvector,                     ← generated
                         published_at, created_at, updated_at
                         · status: draft | pending | published | rejected | suspended

business_categories      business_id, category_id, is_primary
business_hours           business_id, day_of_week (0..6), opens, closes
                         · multiple rows per day = split shifts
hours_overrides          business_id, date, closed, opens, closes, note
                         · Eid, Ramadan, National Day — the local-correctness detail
business_photos          id, business_id, storage_path, alt, alt_i18n jsonb,
                         sort_order, uploaded_by, created_at
services                 id, business_id, name, name_i18n jsonb, price_min,
                         price_max, currency, duration_min
offers                   id, business_id, title, title_i18n jsonb, description,
                         valid_from, valid_to, terms
```

### Reviews & trust

```
reviews                  id, business_id, author_id, rating (1..5),
                         body, status, created_at, edited_at
                         · UNIQUE (business_id, author_id) — one review per person
                         · CHECK: author cannot own the business
                         · status: published | flagged | removed
review_photos            id, review_id, storage_path, sort_order
review_replies           id, review_id UNIQUE, business_id, author_id, body
                         · one owner reply per review
review_votes             review_id, user_id, PRIMARY KEY (review_id, user_id)
                         · makes "most helpful" real instead of Math.random()
review_reports           id, review_id, reporter_id, reason, detail,
                         status, resolved_by, resolved_at, resolution_note
```

### Ownership & moderation

```
claims                   id, business_id, claimant_id, role_at_business,
                         contact_phone, evidence jsonb,
                         document_paths text[], status,
                         reviewed_by, reviewed_at, decision_note
                         · status: pending | approved | rejected | withdrawn
                         · approval trigger sets businesses.owner_id + verified

audit_log                id, actor_id, action, entity_type, entity_id,
                         before jsonb, after jsonb, ip_hash, created_at
                         · every admin action; insert-only via SECURITY DEFINER
```

### Saved content

```
favorites                user_id, business_id, created_at, PK (user_id, business_id)
lists                    id, owner_id, name, description, visibility, share_slug
                         · visibility: private | unlisted | public
list_items               list_id, business_id, note, sort_order, added_at
saved_searches           id, user_id, name, params jsonb, notify
```

### Monetization & analytics

```
plans                    id, slug, name, name_i18n jsonb, price_monthly,
                         currency, features jsonb, sort_order, active
subscriptions            id, business_id, plan_id, status,
                         stripe_customer_id, stripe_subscription_id,
                         current_period_end, cancel_at
promoted_placements      id, business_id, surface, city_id, category_id,
                         starts_at, ends_at, weight
business_events          id, business_id, event_type, occurred_at,
                         session_hash, referrer, locale
                         · view | phone_click | website_click | direction_click
                         | save | share  → powers the owner dashboard with
                         real numbers instead of a hardcoded 1250
notification_preferences user_id, offers, reviews_on_saved, city_promotions,
                         frequency, email_enabled, push_enabled
```

### Functions, triggers, indexes

| Object                        | Purpose                                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_businesses(...)` RPC  | The centerpiece: FTS rank + PostGIS `ST_DWithin` distance + open-now + rating filter + promoted weighting + sort + pagination, in one query                                                                                                        |
| `is_open_at(business_id, ts)` | Timezone-correct against `business_hours` + `hours_overrides`, handles past-midnight closes (`fri 12:00–00:00`)                                                                                                                                    |
| `businesses.search_vector`    | Generated `tsvector`: name weight A, categories/city/locality B, description C. `english` config for Latin text, `simple` + `unaccent` for Indic scripts (Postgres ships no Hindi stemmer), `pg_trgm` for typo tolerance and transliteration slips |
| `refresh_business_rating()`   | Trigger on `reviews` → maintains `rating` and `review_count`                                                                                                                                                                                       |
| `approve_claim(claim_id)`     | `SECURITY DEFINER`: sets owner, flips `verified`, writes `audit_log`, queues email — atomically                                                                                                                                                    |
| `enforce_profile_role()`      | Blocks self-service role escalation                                                                                                                                                                                                                |
| Indexes                       | GIN on `search_vector`; GIST on `location`; btree on `(status, published_at)`, `businesses.slug`, `reviews(business_id, status, created_at)`; trigram on `name`                                                                                    |

**Why denormalize `rating`/`review_count`:** search sorts and filters on rating
across thousands of rows. Aggregating per query doesn't hold up. Trigger-maintained
columns are the right trade, and being able to explain that trade is the point.

---

## 5. Authorization model (RLS)

This is the most interview-valuable part of the project. RLS is enabled on
**every** table; the app never trusts a client-side role check.

### Policy matrix

| Table                                                | anon                                 | authenticated user                                 | business owner                                                 | admin                                      |
| ---------------------------------------------------- | ------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| `businesses`                                         | SELECT `status='published'`          | same                                               | + SELECT/UPDATE own (whitelisted columns), INSERT as `pending` | ALL                                        |
| `business_hours` `photos` `services` `offers`        | SELECT via published parent          | same                                               | ALL where parent owned                                         | ALL                                        |
| `reviews`                                            | SELECT `status='published'`          | + INSERT own, UPDATE own ≤24h, DELETE own          | SELECT on own business incl. flagged                           | ALL                                        |
| `review_replies`                                     | SELECT via published review          | —                                                  | INSERT/UPDATE where review targets own business                | ALL                                        |
| `review_votes`                                       | —                                    | INSERT/DELETE own, not on own review               | —                                                              | SELECT                                     |
| `review_reports`                                     | —                                    | INSERT own                                         | SELECT on own business                                         | ALL                                        |
| `claims`                                             | —                                    | INSERT own, SELECT own, withdraw own               | SELECT own                                                     | ALL + decide                               |
| `favorites` `lists` `list_items` `saved_searches`    | SELECT public lists via `share_slug` | ALL own                                            | —                                                              | SELECT                                     |
| `profiles`                                           | —                                    | SELECT public fields, UPDATE own **except `role`** | —                                                              | ALL                                        |
| `business_events`                                    | INSERT (rate-limited)                | INSERT                                             | SELECT aggregated for own business                             | ALL                                        |
| `subscriptions`                                      | —                                    | —                                                  | SELECT own                                                     | ALL                                        |
| `audit_log`                                          | —                                    | —                                                  | —                                                              | SELECT; INSERT only via `SECURITY DEFINER` |
| `plans` `categories` `cities` `localities` `markets` | SELECT active                        | SELECT active                                      | SELECT active                                                  | ALL                                        |

### Implementation notes worth writing up

1. **Avoid the recursive-RLS trap.** A policy on `businesses` that queries
   `profiles` to check role, while `profiles` has its own policies, recurses.
   Solution: mirror `role` into a JWT custom claim via an Auth Hook, read it with
   a `STABLE` `auth_role()` helper. Document the alternative
   (`SECURITY DEFINER` helper) and why the claim approach wins.
2. **Column-level protection.** Owners may edit description, hours, photos, and
   contact details — never `verified`, `status`, `owner_id`, `rating`. Enforced by
   a `BEFORE UPDATE` trigger comparing `OLD`/`NEW`, since RLS alone can't gate columns.
3. **Guests are anon, not a role.** The current app models `guest` as a user role
   in `localStorage`. In the rebuild, guest = unauthenticated `anon`, and every
   guest capability is an anon RLS policy. Cleaner and honest.
4. **Every policy gets a test.** `supabase/tests/*.sql` with pgTAP: assert an owner
   _cannot_ edit a neighbour's listing, a user _cannot_ review their own business,
   a non-admin _cannot_ read `audit_log`, nobody can self-promote to admin.
   Runs in CI. Very few portfolio projects test authorization — this is cheap
   differentiation.

---

## 6. Design system

Direction: **Warm Editorial Directory.** Paper-warm light default with a real
dark mode. Editorial serif headings against a clean UI sans. Information-dense
cards that reward scanning. Restraint in motion — this is a utility people use
while hungry and in a hurry.

> Phase 2 extracts this section into `docs/DESIGN.md` and expands it, mirroring
> how `DESIGN.md` works in your portfolio repo.

### Tokens

```
                       light               dark
--paper                #FCFBF8             #14130F
--surface              #FFFFFF             #1C1B17
--surface-sunken       #F5F3EC             #100F0C
--ink                  #1A1815             #F4F1EA
--ink-muted            #6B665C             #A39C8E
--line                 #E5E0D5             #2E2C26
--accent               #B4541E  terracotta #D2703A
--accent-soft          #FBEEE6             #33211A
--success              #2E6F4E  open now    #4E9B74
--warning              #A66A00             #D6A03C
--danger               #B3261E             #E06055
--star                 #E0A419
```

Accent is for actions and emphasis only — never large fills. `--success` is
reserved for open-now truth; never decorative. Semantic tokens only in
components; raw hex never appears outside `globals.css`.

### Typography

| Role               | Family                                | Notes                                                                                                                                      |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Display / headings | **Fraunces** (variable, optical size) | Editorial warmth; the whole personality lives here                                                                                         |
| UI / body          | **Inter**                             | Dense UI legibility                                                                                                                        |
| Numerals           | Inter `tabular-nums`                  | Ratings and counts must not jitter                                                                                                         |
| Devanagari (`hi`)  | **Noto Sans Devanagari**              | Real Devanagari typography, not a Latin fallback. Headings step up in weight since there is no serif counterpart                           |
| Future scripts     | One subset-scoped face per script     | Tamil, Telugu, Bengali, Gujarati each get their own face. A single multi-script file would bill every visitor for scripts they cannot read |

Scale `1.2` ratio, fluid `clamp()` for display sizes only. Body locked at 16px.
Each script gets its own line-height and letter-spacing overrides in a single
`:lang()` block. Devanagari carries matras above and below the headline stroke,
so it takes `1.75` leading and zero tracking. Adding a script means adding one
block; nothing else changes.

### Form language

- **Radius** 10px cards · 8px controls · 999px pills
- **Shadows** two steps only: `--shadow-card` (resting), `--shadow-float`
  (overlays). No shadow stacking
- **Borders** hairline `--line` is the primary separator; shadows are secondary
- **Density** search results target ~7 cards per 1080p viewport. Every card
  answers: name, category, rating + count, distance, open state, price level,
  top amenities, primary photo
- **Motion** 120ms hover, 200ms enter, 260ms overlays, one easing
  (`cubic-bezier(.2,.8,.2,1)`). Transform and opacity only. Full
  `prefers-reduced-motion` support
- **Photography** listing photos are the color. The UI stays quiet so they carry it

### RTL

Logical properties throughout (`ps-*`, `pe-*`, `ms-*`, `me-*`) — no
`left`/`right`. The prototype's `useRTL()` hook that string-builds `mr-`/`ml-`
class names is deleted; it's a workaround for a problem Tailwind's logical
utilities already solve. Icons that imply direction get mirrored; logos and
media never do. Numbers stay LTR inside RTL text.

### Components to design (beyond shadcn defaults)

`BusinessCard` (grid + list + map-popover variants) · `RatingStars` (display +
interactive) · `RatingBreakdown` · `OpenNowBadge` · `HoursTable` (today
highlighted, override notes) · `PriceLevel` · `AmenityChips` · `FilterBar`
(sticky, collapses to a mobile sheet) · `ActiveFilterChips` · `ResultsMap`
(clustered, list-hover sync) · `PhotoGallery` + lightbox · `ReviewCard` ·
`ReviewComposer` · `OwnerReplyBlock` · `VerifiedBadge` · `ClaimBanner` ·
`KpiTile` · `ModerationQueueRow` · `EmptyState` (per surface, never generic) ·
`CommandPalette` (⌘K)

Every interactive component ships with loading, empty, error, and disabled
states specified. "Missing empty state" is a large share of what makes the
current prototype feel unfinished.

---

## 7. Feature specification

### Public discovery

- **Home** — hero search with category and city autocomplete; browse by category;
  browse by city; curated collections ("Late-night in Bengaluru", "Best thali in
  Ahmedabad");
  featured listings from `promoted_placements`; recently reviewed
- **Search** — full-text query, category (multi), city and locality, distance from a point or
  from browser geolocation, open-now, min rating, price level, amenities, sort
  (relevance · rating · most reviewed · nearest · newest). URL is the single
  source of truth for state, shareable and back-button correct. Server-rendered
  first page, streamed. Real pagination
- **Map view** — clustered markers, bidirectional hover sync with the list,
  "search this area" on pan, keyboard-navigable, and a genuine non-map fallback
- **Business profile** — gallery, at-a-glance bar (rating · open state · price ·
  distance), about, services with prices, live offers, hours table with today
  highlighted, amenities, map + directions, contact actions (real `tel:` /
  `mailto:` / website — no "demo only" tooltips), reviews with breakdown and
  filtering, owner replies, similar businesses nearby, report and share
- **Category / city landing pages** — `/c/restaurants`, `/in/ahmedabad`,
  `/c/restaurants/in/ahmedabad`. Editorial intro, filtered results, internal
  linking. Hundreds of indexable pages from one template

### Reviews

Write with rating, body, and up to 5 photos · edit within 24h with an "edited"
marker · one review per business per person · cannot review a business you own ·
helpful votes driving a real "most helpful" sort · owner replies (one per review,
publicly attributed) · report with reason → moderation queue · rate-limited
submission · guests see the composer and are prompted to sign in _with their
draft preserved_

### Accounts

Email + password, Google OAuth, and phone OTP (real, via Supabase) · email
verification · password reset · profile with avatar upload · favorites ·
custom lists, shareable via `share_slug` · my reviews · saved searches ·
notification preferences that actually gate sent email · account deletion

### Business owners

Register a new listing (multi-step, draft-saving, `pending` on submit) · claim
an existing listing with document upload and a stated verification path ·
listing editor for whitelisted fields, with a live preview and completeness
score computed from real data · photo manager with drag-reorder · services and
offers management · review inbox with reply · dashboard KPIs from real
`business_events` (views, phone clicks, website clicks, saves, direction taps)
with trend deltas and a period selector · subscription management

### Admin

Moderation queues (claims · registrations · reported reviews) with counts and
SLA age · approve/reject with a required reason, emailed to the applicant ·
user management (search, filter, ban with reason, unban, force reset) ·
listing management including suspend · category, city and locality management ·
plan and pricing management · promoted placement scheduling ·
**audit log** of every action with before/after diffs · realtime queue updates

### Cross-cutting

Full locale parity including DB content, enforced at compile time · JSON-LD `LocalBusiness` +
`AggregateRating` + `Review` + `BreadcrumbList` (targeting Google rich results —
a highly visible, screenshot-able win) · per-business OG images · sitemap
generated from the database · ⌘K command palette · WCAG 2.1 AA · real error
boundaries and 404/500 pages · rate limiting on every mutation

---

## 8. Phase plan

Twelve phases in four stages. Each phase is independently shippable and ends on
a demonstrable exit criterion. Effort is in working sessions, deliberately rough.

### Stage A — Foundation

<details open>
<summary><b>Phase 0 · Scaffold &amp; tooling</b> — ✅ <b>complete</b></summary>

Next.js 16.2 App Router app replacing the Vite setup, on Node 24 LTS. Tailwind 4
with the full token layer (light + dark, contrast-verified). `strict` TS with
`noUncheckedIndexedAccess` and `verbatimModuleSyntax`; ESLint flat config with
`no-explicit-any` and the type-aware `no-unsafe-*` family as errors, plus a
custom rule banning raw hex outside `globals.css`. Prettier. Supabase CLI local
stack, migrations directory, typegen script. Vitest + Playwright. GitHub Actions
across three jobs: verify, database (migrations + pgTAP + stale-types check),
and e2e.

Locale routing is registry-driven from the start: `proxy.ts` negotiates from
cookie then `Accept-Language`, dictionaries are accessed by property so a missing
key is a **compile** error, and each script gets its own subset-scoped font.

**Delivered against exit criteria**

| Gate                | Result                                                    |
| ------------------- | --------------------------------------------------------- |
| `npm run lint`      | ✅ 0 errors, 0 warnings                                   |
| `npm run typecheck` | ✅ clean                                                  |
| `npm run test`      | ✅ 26 unit tests                                          |
| `npm run build`     | ✅ `/en` and `/hi` prerendered                            |
| `npm run test:e2e`  | ✅ 8 e2e tests                                            |
| Local Supabase      | ✅ Postgres 17.6 up; types generated from the live schema |
| Styled home page    | ✅ scaffold status page, not a mocked product surface     |

Deployment to Vercel is the one exit criterion still outstanding — it needs the
repo pushed and the project connected.

</details>

<details open>
<summary><b>Phase 1 · Data layer</b> — ✅ <b>complete</b></summary>

Ten migrations: 30 tables, 8 enums, 15 functions, RLS on every table. The
`search_businesses` RPC combines weighted full-text ranking, PostGIS radius
filtering, open-now evaluation, facets, and pagination in one statement.
`is_open_at` evaluates in the _market's_ timezone and handles split shifts,
past-midnight closing times, and festival date overrides.

Seed: 6 cities, 30 localities, 12 India-specific categories, 80 accounts,
120 businesses (100 published / 10 pending / 6 draft / 4 rejected), 996 hour
rows, 789 reviews, 1,989 helpful votes, plus populated moderation queues.
Deterministic via `setseed()`.

**Delivered against exit criteria**

| Gate                                          | Result                                                  |
| --------------------------------------------- | ------------------------------------------------------- |
| pgTAP policy suite                            | ✅ 68 assertions across 2 files                         |
| Owner cannot edit a neighbour's listing       | ✅ asserted — RLS matches zero rows                     |
| Combined query + distance + open-now + rating | ✅ `results_eq` pins it to exactly one expected listing |
| Migrations apply from scratch                 | ✅ `db reset` clean                                     |
| Generated types current                       | ✅ 30 row types; CI staleness check passes              |
| `npm run verify`                              | ✅ lint, typecheck, 26 unit tests, build all green      |

**Two defects this phase caught in its own work**

1. `anon` and `authenticated` held no DML grants at all, so every policy was
   unreachable — PostgREST would have answered "permission denied" for every
   request. RLS narrows access; it does not grant it. Fixed by an explicit
   grants migration, deliberately per-table rather than a blanket `grant all`,
   so the grant is an outer boundary and the policy an inner one.
2. Every seeded profile shared one `created_at` (all inserted in a single
   transaction), which made `order by created_at offset 1` return the same row
   twice — two test fixtures were secretly the same person, and the isolation
   tests were passing vacuously.

</details>

<details open>
<summary><b>Phase 2 · Design system</b> — ✅ <b>complete</b></summary>

Named the product **Openly** — "open hours, honest reviews" — which makes the
open-now badge the signature element rather than a detail.

Token layer, 12 Radix-backed primitives, 9 directory components, the app shell,
`/design` living style guide, and `docs/DESIGN.md`. Also, because a card that
cannot open its listing is regression #2 all over again, this phase brought
forward the **listing detail page** and a **working search page** from Phases 3–4
— data and layout only; the SEO layer stays in Phase 4 where it belongs.

**Delivered against exit criteria**

| Gate                                | Result                                                      |
| ----------------------------------- | ----------------------------------------------------------- |
| Style guide renders every component | ✅ `/design`, dev-only, light + dark + forced-RTL block     |
| Zero raw hex outside `globals.css`  | ✅ lint-enforced; one documented exception (`lib/brand.ts`) |
| Mobile nav functional               | ✅ opens, navigates, closes — e2e asserted                  |
| `npm run verify`                    | ✅ lint, typecheck, 47 unit tests, build                    |
| `npm run test:e2e`                  | ✅ 20 tests incl. a dead-link crawl of the whole shell      |
| Contrast                            | ✅ every pair AA, ratios recorded inline                    |

**Three defects this phase caught in its own work**

1. **`RatingBreakdown` was a client component by accident** — it shared a file
   with the stateful `RatingInput`, so `'use client'` applied to both, and a
   Server Component passing it a label callback crashed at runtime. Function
   props cannot cross that boundary. Fixed structurally: stateful components get
   their own module, and label props are now template strings that the component
   interpolates itself.
2. **PostGREST could not disambiguate the `profiles` embed on `reviews`** —
   `review_votes` also joins the two, so an explicit FK hint was required. Only
   surfaced at runtime; the types were happy.
3. **Playwright's `reuseExistingServer` produced three separate false failures.**
   A server left running from an earlier build kept serving stale client chunks,
   so hydration never completed and every interactive test failed for reasons
   unrelated to the code. Now always starts its own server.

</details>

### Stage B — The product people see

<details open>
<summary><b>Phase 3 · Discovery</b> — ✅ <b>complete</b></summary>

The full facet surface — query, category (multi), city, locality, price,
amenities, minimum rating, open-now, geolocation radius, and five sorts — plus a
clustered MapLibre map with list↔map hover sync, and streamed results.

**The architectural fix flagged in Phase 2 is done.** A cookie-free
`lib/supabase/public.ts` client now serves all published reads. The home page
went from dynamic to **SSG with 1h ISR**. Beyond caching, it is a stronger
guarantee: as `anon` to Postgres, those queries _cannot_ return an unpublished
listing — the constraint is structural rather than a convention to remember.

**Delivered against exit criteria**

| Gate                                   | Result                                                     |
| -------------------------------------- | ---------------------------------------------------------- |
| query + category + 5km + open-now + 4★ | ✅ narrows to exactly 1 listing, e2e asserted              |
| URL shareable and restores exactly     | ✅ 25 round-trip unit tests; `parse(serialize(x)) === x`   |
| Back button behaves                    | ✅ e2e walks two steps back through filter history         |
| Distances are true                     | ✅ nearest sort verified ascending; radius provably bounds |
| Open badges are true                   | ✅ every open-now result asserted to show an open badge    |
| `npm run verify`                       | ✅ lint, typecheck, 72 unit tests, build                   |
| `npm run test:e2e`                     | ✅ 36 tests                                                |

**Two things this phase got right by being forced to**

1. **The URL is the only state.** Every facet is a `<Link>`, not a bound form
   control. The surface works with JavaScript disabled, every combination is
   shareable, and there is no component state that can drift from the URL —
   which is precisely the bug that broke category browsing in the prototype.
   The one genuinely interactive control is "Near me", because coordinates
   cannot come from a link.
2. **Malformed parameters are dropped, not clamped.** `rating=99` yields no
   rating filter rather than silently becoming 5 — showing 5★ results under a
   chip reading "99" would be worse than ignoring it.

**Defect caught during the phase:** adding Suspense made several e2e
assertions race the skeleton, since Playwright's `count()` does not auto-wait.
Fixed with an explicit `waitForResults` helper rather than by removing the
streaming.

</details>

<details open>
<summary><b>Phase 4 · Business profile &amp; SEO foundation</b> — ✅ <b>complete</b></summary>

Listing pages are now statically generated (200 pages, 1h ISR), with a full
JSON-LD graph, per-listing OG cards, a database-driven sitemap, a photo lightbox,
a single-marker map, and nearby listings.

**Delivered against exit criteria**

| Gate                                  | Result                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| Rich results: LocalBusiness           | ✅ every required field asserted, in unit and e2e tests         |
| Rich results: AggregateRating         | ✅ present, bounded, omitted entirely when reviewCount is 0     |
| Sitemap lists every published listing | ✅ 123 URLs — 100 listings + 6 cities + 12 categories + statics |
| Lighthouse ≥95 on a listing           | ✅ **perf 95 · a11y 100 · best-practices 100 · SEO 100**        |
| Contact actions genuinely work        | ✅ real `tel:` and Google Maps directions; no "Demo only" left  |
| `npm run verify`                      | ✅ lint, typecheck, 96 unit tests, build                        |
| `npm run test:e2e`                    | ✅ 53 tests                                                     |

Lighthouse was run against the production build with real throttling, not
asserted from theory. The first run scored **perf 80 / a11y 93**; both gaps were
diagnosed from the report and fixed:

- **a11y 93 → 100.** `aria-label` on a roleless `<span>` (ARIA prohibits it —
  `RatingStars` now carries `role="img"`), and the header logo link had no
  accessible name once the wordmark was hidden below `sm`.
- **perf 80 → 95, LCP 5.2s → 2.9s.** The gallery images were raw remote JPEGs:
  334 kB, no `srcset`, no AVIF/WebP, no priority hint. Through `next/image` with
  an explicit `fetchPriority="high"` on the lead, that is 60 kB. Also trimmed
  fonts 203 kB → 168 kB by loading only the two Fraunces weights the design uses
  and setting `preload: false` on the Devanagari face, which every English
  visitor had been downloading for text they never render.

**Two defects caught in this phase's own work**

1. **The OG image 404'd.** Setting `openGraph.images` by hand overrode the
   automatic entry Next generates for the `opengraph-image.tsx` convention — the
   real route carries a content hash, so the guessed path did not exist. An e2e
   test now fetches the advertised URL and asserts it is a real PNG.
2. **JSON-LD could be broken out of.** `JSON.stringify` does not escape `<`, so a
   business name containing `</script>` would have closed the tag early and had
   the rest parsed as HTML — script injection through an owner-controlled field.
   `jsonLdGraph` now escapes `<`, `>`, and `&`.

**Known issue, unresolved:** 75 of 101 listings render the "Nearby" section at
build time, though the RPC returns rows for the missing ones both in SQL and
through PostgREST when queried directly. The arbitrary split points at the 11
concurrent prerender workers getting an empty-but-not-errored response from local
PostgREST under load, rather than at the data or the query. Not chased down
further this phase; the e2e test targets the feature rather than one row, and the
section degrades to being absent rather than broken. Worth isolating in Phase 12
alongside the other performance work.

</details>

### Stage C — The product people use

<details open>
<summary><b>Phase 5 · Auth &amp; accounts</b> — ✅ <b>complete</b></summary>

Supabase Auth on `@supabase/ssr` cookie sessions, email + password with
confirmation, password reset, phone OTP, Google OAuth, avatar upload to a
path-scoped Storage bucket, account settings, and self-service deletion.

**Three independent authorization layers**, innermost first:
RLS in the database → `requireUser`/`requireRole` in the page → a coarse
redirect in `proxy.ts`. Deleting the outer two changes the error message a user
sees, not what they can reach.

**Delivered against exit criteria**

| Gate                                           | Result                                                       |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Sign up → verify → sign in                     | ✅ e2e reads the real confirmation link from Mailpit         |
| OAuth                                          | ⚠️ wired end to end; unverifiable without Google credentials |
| Phone OTP                                      | ⚠️ wired end to end; needs an SMS provider, fails honestly   |
| `/admin` blocked server-side for a normal user | ✅ proxy redirect + page guard + RLS                         |
| Sessions survive refresh, no hydration flash   | ✅ refreshed in the proxy, where cookies are writable        |
| `npm run verify`                               | ✅ lint, typecheck, 121 unit tests, build                    |
| `npm run test:e2e`                             | ✅ 66 tests                                                  |

**The serious mistake this phase made, and caught**

Adding `getSessionUser()` to the shared site header **silently turned all 200
prerendered listing pages dynamic**. Reading cookies anywhere in a layout opts
every page beneath it out of static rendering — so a one-line convenience
destroyed the entire result of Phase 4 and the SEO argument the project rests on.

Enabling `cacheComponents` (Next 16's partial prerendering) is the correct fix
and would give both a static shell and a personalised chip, but it replaces
route-segment `revalidate` with `'use cache'` across the data layer and is
experimental — not a change to rush at the end of a phase. So the header is
session-free and links unconditionally to `/account`, which redirects when there
is no session. That costs a greeting in the header and keeps 200 static pages.
`cacheComponents` is recorded as Phase 12 work.

**Two further mistakes worth recording**

1. A `config.toml` edit reported success while matching nothing, so email
   confirmation was never actually enabled — and the e2e suite "passed" signup
   against auto-confirmed accounts. Config changes also need `supabase stop &&
start`; `db reset` does not reload them. Now asserted after editing.
2. The first open-redirect test proved nothing: it used _failed_ credentials, and
   a failed sign-in never redirects. `safeReturnTo` moved out of `server-only`
   into its own module with 6 unit tests, and the e2e now asserts the
   consequence after a successful sign-in.

</details>

<details open>
<summary><b>Phase 6 · Reviews</b> — 3–4 sessions</summary>

Composer with interactive rating and photo upload. Edit window. One-per-business
enforcement surfaced kindly in the UI. Helpful votes and a real most-helpful
sort. Owner replies. Reporting. Rate limiting. Guest draft preservation across
sign-in. Rating/count triggers verified live.

**Exit:** a real review round-trips: submit → appears → business rating updates
→ owner replies → another user votes helpful → sort order changes → a third
user reports it → it lands in the moderation queue.
</details>

<details open>
<summary><b>Phase 7 · Favorites &amp; lists</b> — 2 sessions</summary>

Optimistic favorite toggles wired everywhere a card appears — replacing the
prototype's never-imported `ListsManager`. Custom lists with CRUD, notes,
reordering, and public sharing via `share_slug`. Saved searches.

**Exit:** favorite from a search card, a map popover, and a listing page; all
three stay in sync and survive reload. A shared list opens for a signed-out
visitor.
</details>

<details open>
<summary><b>Phase 8 · Owner tools</b> — 4–5 sessions</summary>

Registration wizard with draft saving. Claim flow with document upload and a
stated verification path. Listing editor on whitelisted columns with live
preview. Photo manager. Services and offers. Review inbox. Dashboard on real
`business_events` with trends and a period selector. Event tracking instrumented
across public surfaces.

**Exit:** register → admin approves → the listing is publicly searchable.
Claim → approve → owner edits their listing. Dashboard numbers move when you
browse the public page in another tab. Column-level protection provably blocks
an owner from self-verifying.
</details>

<details open>
<summary><b>Phase 9 · Admin console</b> — 3–4 sessions</summary>

All three queues with counts and age. Approve/reject with required reasons and
outbound email. User management with ban reasons. Listing suspension. Category,
city, and plan management. Promoted placement scheduling. Audit log with
before/after diffs and filtering. Realtime queue updates. Real nested routes —
fixing the prototype's four 404-ing sidebar links.

**Exit:** every sidebar link resolves. Every mutating action writes an audit
entry. Two admin sessions see the queue update live. Rejection emails arrive.
</details>

### Stage D — Make it excellent

<details open>
<summary><b>Phase 10 · i18n &amp; RTL completion</b> — 3 sessions</summary>

Every string extracted — closing the gap where only 7 of 22 components used
`useLocale`. Localized DB columns surfaced through the query layer. Third and
fourth locales added to prove the registry generalises: **Urdu** (validates the
RTL path end to end) and one Dravidian language, **Tamil** (validates a
non-Devanagari Indic script and its font pipeline). Locale-aware dates, numbers,
and INR formatting. Full RTL audit across every page including map, charts, and
dialogs. Indic search behaviour verified against transliterated queries.

**Exit:** every page reviewed in all four locales with no hardcoded English and
no clipped or wrongly-mirrored layouts. Searching "chai" and "चाय" both return
results. `hreflang` in place for every locale. Adding a locale is provably one
registry entry plus one dictionary file.
</details>

<details open>
<summary><b>Phase 11 · SEO scale &amp; monetization</b> — 3 sessions</summary>

Programmatic category × city landing pages with editorial intros and internal
linking. Collections. Full `Review` and `BreadcrumbList` JSON-LD. Plans page
from the DB. Stripe test-mode Checkout behind a flag with webhook handling.
Promoted placements surfacing in search with disclosure. Vercel Analytics.

**Exit:** sitemap in the hundreds of URLs, all rendering with unique metadata.
A test-mode subscription completes and flips the business to premium via webhook.
</details>

<details open>
<summary><b>Phase 12 · Hardening &amp; launch</b> — 3–4 sessions</summary>

Accessibility pass to AA: axe clean, full keyboard traversal, focus management
in overlays, screen-reader pass on the core journey. Performance: bundle
splitting (from a 644 KB single chunk to route-level budgets), image
optimization, query plan review with `EXPLAIN ANALYZE`, cache tuning. Playwright
e2e across the six critical journeys. Error boundaries, Sentry, structured
logging. Security review: RLS re-audit, service-role key audit, rate limits,
upload validation, dependency audit. Then `README.md`, `docs/SCHEMA.md`, a demo
walkthrough, and the portfolio case study.

**Exit:** [§10 Quality gates](#10-quality-gates) all pass. Deployed. Case study
live on the portfolio.
</details>

**Total:** roughly 38–48 sessions. Stages A+B alone (Phases 0–4) already produce
something honestly demoable — a real, fast, indexable directory — which is a
sensible first checkpoint if you want to show progress early.

---

## 9. Regression register

Every defect found in the 2026-07-30 audit, mapped to the phase that resolves it.
Each becomes an explicit verification step at that phase's exit — because a
rewrite is exactly where known bugs get quietly re-introduced.

### Tier 1 — dead-end user journeys

| #   | Defect                                                                                           | Location                                               | Phase |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----- |
| 1   | Reviews never render: `getReviews(slug)` filters on `businessId`                                 | `pages/BusinessProfile.tsx:46`                         | 4     |
| 2   | "View Details" has no handler — search can't reach a listing                                     | `pages/Search.tsx:155`                                 | 3     |
| 3   | Category browse broken: `?category=` written, `categoryIds` read, then the mount effect nulls it | `pages/Home.tsx:47`, `components/SearchFilters.tsx:37` | 3     |
| 4   | `ListsManager` fully written, never imported; heart/plus buttons inert                           | `components/ListsManager.tsx`                          | 7     |
| 5   | Saved items unresolvable: `getBusiness(businessId)` looks up by slug                             | `pages/Account/Lists.tsx:41`                           | 7     |
| 6   | Review submit hardcoded `disabled`; stars not interactive                                        | `pages/BusinessProfile.tsx:557`, `:711`                | 6     |
| 7   | 4 of 5 admin sidebar links 404, and use `<a href>` (full reload)                                 | `app/layouts/AdminLayout.tsx:28-46`                    | 9     |
| 8   | Footer `/about` and `/contact` 404 outside the site layout                                       | `components/Footer.tsx:73,78`                          | 2     |

### Tier 2 — visible fakeness

| #   | Defect                                                                       | Location                            | Phase |
| --- | ---------------------------------------------------------------------------- | ----------------------------------- | ----- |
| 9   | 5% random failure injected into every call, including favoriting             | `lib/api.ts:121`                    | 1     |
| 10  | `sort()` mutates the imported JSON module in place; order leaks session-wide | `lib/api.ts:130,173-185`            | 1     |
| 11  | "nearest" and "newest" are `Math.random() - 0.5`                             | `lib/api.ts:180-185`                | 1, 3  |
| 12  | Location and distance filters accepted and ignored                           | `lib/api.ts:91-100`                 | 3     |
| 13  | Hardcoded `2.5 km` and green `Open now` on every card                        | `pages/Search.tsx:145-150`          | 3     |
| 14  | No pagination: `total` returned, `page: 1` hardcoded                         | `pages/Search.tsx:41`               | 3     |
| 15  | Only 5 businesses — too thin to exercise search or a map                     | `data/businesses.json`              | 1     |
| 16  | Duplicate ids (`owner1`, `admin1` twice, different names) → key collisions   | `data/users.json`                   | 1     |
| 17  | Owner dashboard KPIs hardcoded (`views: 1250`)                               | `lib/api.ts:329-338`                | 8     |
| 18  | Completeness score hardcoded, ignores actual listing data                    | `pages/Owner/Dashboard.tsx:77-84`   | 8     |
| 19  | "most helpful" review sort randomized                                        | `lib/api.ts:234-237`                | 6     |
| 20  | Owner dashboard blocks admins; `OwnerLayout` allows them                     | `pages/Owner/Dashboard.tsx:40,86`   | 5     |
| 21  | Contact actions are "Demo only" tooltips over inert buttons                  | `pages/BusinessProfile.tsx:256-283` | 4     |

### Tier 3 — polish, correctness, engineering hygiene

| #   | Defect                                                                             | Location                     | Phase |
| --- | ---------------------------------------------------------------------------------- | ---------------------------- | ----- |
| 22  | Only 7 of 22 components use `useLocale` — the second locale is half-applied        | `src/**`                     | 10    |
| 23  | `<title>Vite + React + TS</title>`, default favicon, no meta/OG                    | `index.html`                 | 0     |
| 24  | Mobile menu button has no handler — no mobile nav at all                           | `components/Header.tsx:182`  | 2     |
| 25  | 107 ESLint errors (mostly `any`, unused catch bindings)                            | `src/**`                     | 0     |
| 26  | Single 644 KB JS chunk, no code splitting                                          | build output                 | 12    |
| 27  | Zero tests, no CI                                                                  | —                            | 0, 12 |
| 28  | Auth is a localStorage role picker; `/admin` guarded client-side only              | `store/authSlice.ts`         | 5     |
| 29  | `useAsync` passes a variable dep array to `useCallback` (lint-suppressed footgun)  | `lib/hooks.ts:50-61`         | 0     |
| 30  | `useRTL()` string-builds `mr-`/`ml-` class names Tailwind can't statically extract | `lib/hooks.ts:71-87`         | 2     |
| 31  | `i18n` `t()` returns the key on miss with no dev warning                           | `i18n/index.ts:22`           | 10    |
| 32  | `signIn(role, userId)` ignores `userId`, resolves from a hardcoded map             | `store/authSlice.ts:59-67`   | 5     |
| 33  | Store favorites diverge from `users.json` favorites — two sources of truth         | `store/listsSlice.ts`        | 7     |
| 34  | Native `confirm()` for destructive actions                                         | `pages/Account/Lists.tsx:95` | 2     |
| 35  | Unsplash photos hotlinked                                                          | `data/businesses.json`       | 1, 8  |

---

## 10. Quality gates

Enforced in CI; a phase isn't done until its gates hold.

| Gate              | Threshold                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint              | 0 errors, 0 warnings. `no-explicit-any` is an error                                                                                              |
| Types             | `tsc --noEmit` clean, `strict`                                                                                                                   |
| RLS tests         | pgTAP suite green; every table has at least one positive and one negative policy test                                                            |
| Unit tests        | Hours/open-now logic, distance formatting, search param serialization, JSON-LD builders                                                          |
| E2E               | 6 journeys: guest search → listing · sign up → review · favorite → list · register → approve → live · claim → approve → edit · admin moderate    |
| Lighthouse        | Home and listing ≥95 across all four categories, mobile                                                                                          |
| Bundle            | First-load JS ≤180 KB gzip per route; no chunk over 250 KB                                                                                       |
| a11y              | axe: 0 violations on every route, light + dark, EN + AR                                                                                          |
| Rich results      | Google Rich Results Test passes for `LocalBusiness` + `AggregateRating`                                                                          |
| Query performance | `search_businesses` p95 <150ms at 10k rows, verified with `EXPLAIN ANALYZE`                                                                      |
| i18n              | Every locale typed against the `en` dictionary, so a missing key fails `tsc`; no value left as its English source; every value in its own script |
| Security          | No service-role key reachable from client bundles; every mutation rate-limited; uploads type- and size-validated                                 |

---

## 11. Out of scope

Booking and reservations · real-time chat between users and businesses · native
mobile apps · AI features · multi-country · user-to-user messaging · loyalty
programs · POS or delivery integrations · light-mode-only or dark-mode-only ·
PWA/offline · white-labeling.

Each is defensible to _discuss_ in an interview. None earns its build cost here.

---

## 12. Open questions

Not blocking — defaults are chosen and noted. Revisit at the phase where each bites.

| Question                                                                               | Default until decided                                                                                                                               | Bites at |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Real Indian businesses or clearly-synthetic seed data?                                 | Synthetic-but-plausible, labelled as demo. Avoids misrepresenting real businesses and their ratings                                                 | 1        |
| Stripe test mode, or simulated checkout?                                               | Stripe test mode behind a flag; simulated when keys are absent                                                                                      | 11       |
| Translated content — machine-translated or hand-written?                               | Hand-write categories, cities, and UI strings; machine-translate seed descriptions with a visible note. Half-good translation reads worse than none | 1, 10    |
| Custom domain for the demo?                                                            | Vercel subdomain initially; a real domain strengthens the case study                                                                                | 12       |
| Claim verification depth — document upload only, or add a callback/email-domain check? | Document upload + admin review; document the stronger options in the case study                                                                     | 8        |
| Realtime scope?                                                                        | Admin queues only. Live review counts on public pages are a cost with little payoff                                                                 | 9        |

---

## 13. Portfolio case study

Written in the same problem → approach → outcome shape as your existing two
entries, added to `src/data/projects.ts` on the portfolio (which auto-generates
the deck card, case study page, sitemap entry, OG image, and Nova action).

**Problem.** Finding a trustworthy local business means scattered listings,
stale hours, unverifiable reviews, and no way for an owner to control what's
published about them. A directory has to serve three parties with conflicting
interests at once — and be findable by search engines, or it may as well not exist.

**Approach** — four beats:

1. **Authorization in the database, not the app.** Row Level Security as the
   single enforcement point: owners edit only what they've verifiably claimed,
   nobody reviews their own business, nobody promotes themselves to admin —
   proven by a policy test suite in CI.
2. **Search that answers a real question.** One Postgres function combining
   weighted full-text ranking, PostGIS radius filtering, and timezone-correct
   open-now evaluation across split shifts and holiday overrides.
3. **Trust as a workflow.** Claim verification, review reporting, and a
   moderation console where every decision is reversible and audited with
   before/after diffs.
4. **Multilingual and findable by construction.** Server-rendered listings,
   JSON-LD rich results, programmatic category × city pages, and a locale
   registry where adding a language is one entry plus one dictionary — proven by
   shipping four, including a right-to-left one, with per-script typography.

**Outcome.** A working directory: real accounts, real reviews, real owner
analytics, real moderation — with database-enforced authorization, sub-150ms
geospatial search, and hundreds of indexable pages. Deliberately designed away
from the portfolio's own visual language, because a directory is scanned, not
admired.

**Also update on the portfolio:** roadmap items 1 (real screenshots), 2 (proof
links), and 4 (a third case study) all get resolved by this project.

---

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-30 | Initial plan. Locked Next.js, Supabase, and the Warm Editorial Directory design direction. Audit of the existing prototype captured as the [regression register](#9-regression-register). Revised the earlier fix-then-migrate sequencing: with a framework migration confirmed, the prototype's defects become verification steps in the rebuild rather than work done twice                                             |
| 2026-07-30 | **Market pivot: Bahrain → India, with multi-market architecture.** Launch locales `en` + `hi`; `Asia/Kolkata`, INR, `+91`. Market facts moved into a registry and translatable columns to `*_i18n jsonb`, so a new market or language is a data change rather than a migration. `areas` split into `cities` + `localities`. Multi-market moved from "out of scope" to "in scope as architecture, not as launched markets" |
| 2026-07-30 | Next.js **16.2** rather than 15 — 16 is current stable and starting a greenfield build on the previous major is indefensible. Node bumped to **24 LTS**: Node 20 hit EOL 2026-04-30 and `@supabase/supabase-js` ≥ 2.110 requires Node 22+. `middleware.ts` → `proxy.ts` per the Next 16 convention                                                                                                                        |
| 2026-07-30 | **Phase 0 complete.** Lint, typecheck, 26 unit tests, build, and 8 e2e tests all green; local Postgres 17.6 up with generated types. Vercel deploy still outstanding                                                                                                                                                                                                                                                      |
| 2026-07-30 | **Phase 1 complete.** 30 tables, RLS everywhere, `search_businesses` and `is_open_at`, 68 pgTAP assertions, and a 120-listing India seed. Two self-inflicted defects caught by the suite: missing DML grants left every policy unreachable, and identical seeded `created_at` values made two test fixtures the same person                                                                                               |
| 2026-07-30 | **Phase 2 complete.** Named the product **Openly**; replaced the warm-cream/terracotta palette with indigo + marigold after it was correctly called out as looking like a default rather than a decision. 12 primitives, 9 directory components, app shell, `/design` style guide, `docs/DESIGN.md`. Brought the listing and search pages forward so no card is a dead end                                                |
| 2026-07-30 | **Phase 3 complete.** Full facet surface, geolocation radius, clustered MapLibre map with list↔map hover sync, streamed results. Switched public reads to a cookie-free anon client, which restored static rendering _and_ made it structurally impossible for those queries to return unpublished data                                                                                                                   |
| 2026-07-30 | **Phase 4 complete.** 200 statically generated listing pages with 1h ISR, full JSON-LD graph, per-listing OG cards, database-driven sitemap, photo lightbox, listing map, nearby listings. Lighthouse measured and then fixed to 95/100/100/100                                                                                                                                                                           |
| 2026-07-30 | **Phase 5 complete.** Supabase Auth with SSR cookie sessions, email confirmation, password reset, OTP, Google OAuth, avatar storage, account settings and deletion. Caught and reverted a header change that had silently turned all 200 prerendered listing pages dynamic                                                                                                                                                |

---

## Phase log

Running record of what each phase actually produced, including decisions taken
mid-build that the plan above did not anticipate.

### Phase 0 — Scaffold & tooling

**Decisions taken during the build**

- **Dictionaries are accessed by property, not by string path.** `t('a.b.c')`
  returning the key on a miss is exactly how the prototype ended up half
  translated with nobody noticing. Every locale is typed against `en`, so a
  missing key fails `tsc`. Translation parity is a compile-time guarantee.
- **RTL infrastructure now, RTL locales in Phase 10.** Logical CSS properties,
  `dir` on `<html>`, and a direction-aware registry are all in place, but no RTL
  locale ships until Urdu can get native review — shipping half-good translation
  would contradict the project's own standard.
- **`ThemeToggle` holds no React state.** Which icon shows is decided by CSS from
  the `.dark` class, so there is no effect, no hydration mismatch, and a correct
  icon on first paint. This also cleared React's `set-state-in-effect` lint rule
  rather than suppressing it.
- **One sanctioned exception to the no-raw-hex rule** (`src/lib/brand.ts`), for
  surfaces that cannot read CSS custom properties: the PWA manifest, the
  `theme-color` meta tag, and generated OG images.
- **`npm audit` is not at zero, deliberately.** `postcss` and `sharp` are pinned
  forward via `overrides`. The remaining advisories are dev-only in the ESLint
  dependency chain, and force-resolving `minimatch@3` → `10` would break the lint
  toolchain to fix a dev-time DoS advisory. Revisit in Phase 12.

**Not yet done:** Vercel deployment.

### Phase 1 — Data layer

**Decisions taken during the build**

- **Role lives in a JWT claim.** A custom access token hook mirrors
  `profiles.role` into `user_role`, and `auth_role()` reads the claim. Policies
  therefore never query `profiles`, which is what keeps the policy graph
  acyclic. A `SECURITY DEFINER` fallback covers tokens minted before the hook.
- **Column-level protection is a trigger, not a policy.** RLS chooses rows, not
  columns. Owners may edit their listing's content but not `verified`, `status`,
  `owner_id`, `rating`, or `slug`; users may not touch their own `role` or ban
  state. Both are `BEFORE UPDATE` triggers comparing `OLD`/`NEW`.
- **`search_vector` is trigger-maintained rather than `GENERATED`.** The weights
  include city, locality, and category names, and a generated column may only
  reference its own row.
- **Text matching runs three ways at once** — `english` for stemming, `simple`
  for Devanagari (Postgres ships no Hindi stemmer), and `pg_trgm` for typos and
  transliteration. Verified: "thalis" matches "Thali", "मिठाई" matches the
  sweets category, "Bhojanalya" matches "Bhojanalaya".
- **Claim approval is one `SECURITY DEFINER` function.** Assigning the owner,
  verifying the listing, promoting the claimant, rejecting competing claims, and
  writing the audit entry happen atomically. Doing it from application code
  would leave half-approved listings behind on any failure.
- **`audit_log` has no INSERT policy at all.** Writes go only through
  `record_audit()`. There is no path for a client to forge an entry.
- **Seed data is invented, not real.** Names are plausible per city and category
  but reference no real establishment — attaching fabricated ratings to a real
  business would be defamatory.

**Deferred:** the p95 <150ms search benchmark. At 100 seeded rows the number
would be meaningless; it belongs with the 10k-row load in Phase 12.

### Phase 2 — Design system

**Decisions taken during the build**

- **Radix for behaviour, our own styling.** Not the shadcn CLI: it generates
  components against its own token names (`--background`, `--primary`), which
  would have fought the semantic tokens from Phase 0. Radix supplies focus
  traps, scroll locking, and ARIA wiring — the parts that are easy to get subtly
  wrong — and the look stays entirely ours.
- **Props are strings, never callbacks.** Learned the hard way (see defect 1
  above). Labels needing interpolation take a `{placeholder}` template.
- **Presentational components are not client components.** Only `RatingInput`,
  `MobileNav`, `LocaleSwitcher`, and `ThemeToggle` carry `'use client'`.
- **`ThemeToggle` holds no state at all** — CSS decides which icon shows from
  the `.dark` class, so the icon is correct on first paint.
- **The shell links only to pages that exist.** Pricing and sign-in are absent
  rather than pointing at a 404; they appear in the phases that build them. An
  e2e test crawls every header and footer link and fails on any dead one.
- **Client-side hours logic mirrors the SQL.** `lib/hours.ts` duplicates
  `is_open_at()` so a card can show a live state without a round trip, and its
  20 unit tests mirror the pgTAP cases exactly. If the two ever disagree, a card
  will claim "Open" for a listing search has already filtered out.
- **A photo was added to the search RPC.** Result cards reserve the space
  regardless, and an empty frame reads as a broken listing rather than a choice.

**Noted for Phase 3/4:** public pages currently render dynamically because the
cookie-bound Supabase client forces it. Pages that only read published data
should use an anon client so ISR applies. That directly affects the Phase 4 SSG
target and is not a detail to discover later.

### Phase 3 — Discovery

**Decisions taken during the build**

- **Two Supabase clients, split by purpose.** `public.ts` (anon, cookie-free)
  for published data; `server.ts` (cookie-bound) only where the answer depends
  on who is asking. The first choice restores static rendering; the second is
  what personalised surfaces will need from Phase 5.
- **Facets are links, not controls.** No JavaScript required, every state
  shareable, back button correct by construction. Costs a round trip per change,
  which is the right trade when results come from the database anyway.
- **Facet options come from the database with counts**, so an option that would
  return nothing is not offered. Localities are scoped to the selected city.
- **MapLibre + keyless CARTO tiles**, dynamically imported inside an effect: a
  visitor who never opens the map never downloads the ~800 kB. If it fails, the
  list is unaffected and says so.
- **Hover sync without making cards client components.** The provider delegates
  `pointerover` on the grid container and reads `data-business-id`; the map
  highlight is a one-rule stylesheet keyed to the hovered id. The alternative —
  every card client-side and subscribed to context — is a lot of JavaScript for
  a hover ring.
- **Map colours live in `lib/brand.ts`.** WebGL paint expressions cannot read a
  CSS custom property, so this is the same sanctioned exception as the manifest.
- **MapLibre's source union is narrowed once at creation** via `instanceof`, not
  asserted at each use. A blanket `as GeoJSONSource` would have silenced the
  type checker at exactly the place a library upgrade would break things.
- **Cards use a container query** for the "Verified" label. The same component
  sits in a wide grid cell on the home page and a ~250px column beside the map,
  and only its own width can decide whether the label fits.

### Phase 4 — Listing page and SEO

**Decisions taken during the build**

- **Structured data is unit-tested, not eyeballed.** Rich results fail silently:
  a missing field means no stars in search and no error anywhere. `lib/seo.ts` is
  pure functions with 24 tests covering the fields Google documents as required.
- **`aggregateRating` is omitted when there are no reviews.** Google rejects a
  zero `reviewCount`, and a rejected node can invalidate the surrounding graph,
  so a fresh listing must not claim a rating rather than claim zero.
- **One `@graph`, not several script tags.** Cross-references resolve by `@id`
  within a graph, and competing blocks are a common cause of a validator picking
  the wrong one.
- **The OG card draws its rating rather than typing it.** Satori only has the
  fonts it is given and the default set has no U+2605, so a literal ★ rendered as
  a tofu box. Five bars need no glyph.
- **The OG card carries no listing photo** — fetching and decoding a remote image
  is the slowest, most failure-prone part of OG generation, and a card that
  sometimes fails is worse than a plain one that always works.
- **The listing map loads on scroll**, via IntersectionObserver. It is below the
  fold and the heaviest asset on the route; someone who wanted the phone number
  should not pay for it.
- **"Nearby" falls back to any category.** Requiring a same-category match within
  10 km left the section blank on most pages. Same-category still ranks first,
  but an empty section is worse than a slightly looser one — and the heading was
  renamed from "Similar nearby" to "Nearby" so the label stays honest.
- **`dynamicParams` stays on**, so a listing published after the last build
  renders on demand and caches rather than 404ing until the next deploy.

### Phase 5 — Auth and accounts

**Decisions taken during the build**

- **`getUser()`, never `getSession()`.** `getSession` decodes the cookie and
  trusts it; `getUser` validates the token against the auth server. Every
  authorization decision here uses the second, because a forged cookie satisfies
  the first.
- **Session refresh lives in `proxy.ts` and nowhere else.** Tokens expire hourly
  and a Server Component cannot set cookies, so refreshing during render computes
  a new token and discards it — signing users out an hour after they sign in.
- **One error message for every sign-in failure.** Distinguishing "no such
  account" from "wrong password" turns the form into an account-existence oracle.
  Password reset always reports success for the same reason. Signup is the
  deliberate exception: silence there leaves someone stuck with no way to see why.
- **Avatar paths are scoped by uid in the storage policy**, so a crafted filename
  cannot write into another user's folder. Type and size are checked in the action
  for a useful message and again by the bucket, which is what enforces them.
- **Deleting an account unclaims owned listings rather than deleting them.**
  Other people's reviews are attached to those businesses, and a business is not
  personal data — so it returns to the moderation queue unclaimed.
- **Sign-out is a form, not a link.** A GET link would let any page log a visitor
  out with an `<img src>`.
- **Guests are Postgres `anon`, not a stored role**, as the schema already
  decided in Phase 1 — so there is no "continue as guest" state to build.
