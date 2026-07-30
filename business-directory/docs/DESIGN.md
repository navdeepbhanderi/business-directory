# Design system — Openly

**Direction: "Indigo Editorial Directory."**

A directory is _scanned_, not admired. Someone opens it hungry, in a hurry, on a
phone, and needs five facts fast: is it any good, is it near me, is it open,
roughly what does it cost, and can I trust the listing. Every decision below
serves that, and anything that competes with it is wrong here even if it is
beautiful elsewhere.

> Read this before changing any visual or motion code.
> The living reference is the `/design` route (development only).

---

## Why this palette

Cool neutral surfaces, **deep indigo** for action, **marigold** for ratings.

Indigo and marigold are both authentically Indian references — indigo dye and
festival marigolds — rather than a generic product palette. The base greys are
deliberately _cool_: an earlier pass used warm cream paper with a terracotta
accent and, correctly, got called out for looking like a tool's default rather
than a decision about this product.

This is also deliberately **not** the visual language of
[navdeepbhanderi.dev](https://navdeepbhanderi.dev), which is dark-only cinematic
monochrome. Designing for the product rather than for the portfolio is the point.

## Tokens

`src/app/globals.css` is the **only** file where a raw colour value may appear.
ESLint fails the build on a hex literal anywhere else. The single sanctioned
exception is `src/lib/brand.ts`, for surfaces that cannot read CSS custom
properties (PWA manifest, `theme-color`, generated OG images).

|                    | light     | dark      | notes                              |
| ------------------ | --------- | --------- | ---------------------------------- |
| `--paper`          | `#fbfbfc` | `#0e1016` | page canvas                        |
| `--surface`        | `#ffffff` | `#171a22` | raised: cards, sheets              |
| `--surface-sunken` | `#f1f2f6` | `#0a0c11` | recessed: wells, table headers     |
| `--ink`            | `#14161f` | `#f2f3f7` | 17.5:1 / 17.2:1 on paper           |
| `--ink-muted`      | `#5a5f70` | `#9aa0b2` | 6.1:1 / 7.3:1 on paper             |
| `--line`           | `#e2e4ec` | `#262a36` | hairline — the primary separator   |
| `--line-strong`    | `#c8cbd8` | `#363a46` | input borders, emphasis            |
| `--accent`         | `#363c9c` | `#8e95f2` | indigo — 8.9:1 / 7.0:1 on paper    |
| `--accent-ink`     | `#ffffff` | `#0e1016` | 9.2:1 / 7.0:1 on accent            |
| `--success`        | `#17734c` | `#55c193` | **open-now truth only**            |
| `--star`           | `#e8a020` | `#e8a020` | marigold, identical in both themes |

Every pair above was contrast-checked and meets WCAG 2.1 AA for normal text.
The ratios are recorded inline in `globals.css` so a future edit that breaks one
is visible in the diff.

### Rules

- **Accent is for action and emphasis only.** Never a large fill. If two
  elements on a screen are both accent-primary, one of them is wrong.
- **`--success` means "open right now."** Never decorative. A green dot on this
  product is a factual claim about a business's door.
- **`--star` is fixed across themes** so a 4.5 looks like a 4.5 in either mode.
- **Semantic tokens only in components.** No `bg-[#fff]`, no `bg-slate-100`.

## Typography

| Role               | Family                   | Notes                                              |
| ------------------ | ------------------------ | -------------------------------------------------- |
| Display / headings | **Fraunces**             | Editorial warmth; the whole personality lives here |
| UI / body          | **Inter**                | Dense UI legibility                                |
| Numerals           | Inter `tabular-nums`     | Ratings and counts must not jitter in a dense row  |
| Devanagari (`hi`)  | **Noto Sans Devanagari** | Real Devanagari, not a Latin fallback              |

- Body is **locked at 16px**. Only display sizes are fluid `clamp()`.
- Each script gets one `:lang()` block. Devanagari carries matras above and
  below the headline stroke, so it takes `1.75` leading and zero tracking, and
  headings step up in weight rather than changing family — there is no
  Devanagari counterpart to Fraunces.
- Adding a script means adding one face and one block. Nothing else changes.
- One subset-scoped face per script. A single multi-script file would bill every
  visitor for scripts they cannot read.

## Form language

- **Radius** — `10px` cards · `8px` controls · pill for chips and avatars.
- **Elevation** — exactly two steps: `--shadow-card` (resting) and
  `--shadow-float` (overlays). No stacking. On dark surfaces borders do the work
  and shadows recede.
- **Borders** — the hairline `--line` is the primary separator; shadow is
  secondary. This is a dense product; borders read at a glance, shadows do not.
- **Density** — search results target ~7 cards per 1080p viewport. Every card
  answers all five scanning questions plus a photo.
- **Motion** — one easing (`--ease-standard`), three durations: `120ms` hover,
  `200ms` enter, `260ms` overlay. Transform and opacity only. A global
  `prefers-reduced-motion` block reduces everything to `0.01ms`.
- **Photography carries the colour.** The interface stays quiet so listing
  photos do not have to compete with it.

## Right-to-left

RTL is built now even though no RTL locale ships yet — Urdu is one of India's
scheduled languages and lands in Phase 10 with native review.

- **Logical properties throughout**: `ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`,
  `end-*`, `border-s-*`, `rounded-s-*`. Never `left`/`right`.
- Sheets are anchored to `start`/`end`, so the panel enters from the correct
  edge without a second implementation.
- Direction-implying icons mirror (`rtl:rotate-180`); logos and media never do.
- Numbers stay LTR inside RTL text via the `.num` utility.
- The `/design` route includes a forced-`dir="rtl"` block for spot checks.

## Server and client boundaries

Presentational components are **not** client components. Only genuinely
interactive pieces get `'use client'` — currently `RatingInput`, `MobileNav`,
`LocaleSwitcher`, and `ThemeToggle`.

This is not only about bundle size. A `'use client'` module cannot receive
function props from a Server Component, and an early version put
`RatingBreakdown` in the same file as the stateful `RatingInput`, which turned
every label callback into a runtime error. Two consequences, both now rules:

1. **Split stateful components into their own module.**
2. **Props are strings, never callbacks.** Labels needing interpolation take a
   template with `{placeholders}` and call `interpolate()` internally. That keeps
   a component usable on either side of the boundary.

## Component inventory

**Primitives** (`src/components/ui/`) — Radix for behaviour, our tokens for
looks. Radix supplies focus traps, scroll locking, and ARIA wiring; those are
easy to get subtly wrong and expensive to debug.

`button` · `badge` · `card` · `input` · `textarea` · `skeleton` · `dialog` ·
`sheet` · `select` · `switch` · `tooltip` · `dropdown-menu`

**Directory** (`src/components/directory/`) — where the personality lives.

`BusinessCard` (grid + list + skeleton) · `RatingStars` · `RatingBreakdown` ·
`RatingInput` · `OpenNowBadge` · `HoursTable` · `AmenityChips` · `EmptyState` ·
`SectionHeading`

**Layout** (`src/components/layout/`) — `Header` · `MobileNav` · `Footer` ·
`ThemeToggle` · `LocaleSwitcher` · `ThemeScript`

### Two components worth reading before changing

**`OpenNowBadge`** says more than "Open". At 22:20 the useful answer is
"Closes 10:30 pm"; when shut it is "Opens 9:00 am". It flags the final hour as
`closing-soon` in `--warning`. The prototype rendered a hardcoded green
"Open now" on every card regardless of the hours printed beside it.

**`EmptyState`** requires a title, a body, and an action slot. Generic
"No results" dead ends were a large part of what made the prototype feel
unfinished, so the component makes the next step structural rather than optional.

## Non-negotiables

1. No raw colour outside `globals.css` (lint-enforced).
2. No physical `left`/`right` in layout.
3. No `'use client'` on something that does not need state.
4. Every interactive component has loading, empty, error, and disabled states.
5. Every destination in the shell resolves — an e2e test crawls it and fails on
   any dead link. Four of five nav links 404'ing is what this rebuild exists to
   correct, and it is not allowed to happen twice.
6. Contrast is checked, not assumed, and the ratio is recorded in a comment.
