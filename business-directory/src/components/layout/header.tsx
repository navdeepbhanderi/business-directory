import Link from 'next/link'
import { Search, User } from 'lucide-react'
import { localeMeta, locales, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries/en'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { MobileNav } from '@/components/layout/mobile-nav'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'

/**
 * Site header.
 *
 * Every destination here resolves to a real page. Entry points for surfaces
 * that do not exist yet — pricing, sign-in — are deliberately absent rather
 * than linked to a 404; they appear in the phase that builds them. An e2e test
 * crawls the shell and fails on any dead link, because four of five nav links
 * 404'ing is precisely what the rebuild is correcting.
 */
/**
 * Site header.
 *
 * Deliberately does NOT read the session. Reading cookies anywhere in a layout
 * opts every page beneath it out of static rendering — when this header called
 * `getSessionUser()`, all 200 prerendered listing pages silently became dynamic,
 * forfeiting the caching and indexability the whole project is built around.
 *
 * So the account entry point is unconditional: it always links to `/account`,
 * which redirects to sign-in when there is no session. That is strictly better
 * than a client-side session check, which would flash a signed-out state on
 * every page load, and it costs only the ability to greet someone by name in the
 * header — which the account page does anyway.
 *
 * Rendering both a static shell and a personalised chip needs partial
 * prerendering (`cacheComponents` in Next 16). That is the right end state and is
 * recorded as follow-up work; it replaces route-segment `revalidate` with
 * `'use cache'` across the data layer, which is not a change to rush.
 */
export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`

  const primary = [
    { href: `${base}/search`, label: dict.nav.search },
    // Saved sits in the shell rather than only inside the account page: a
    // favourite nobody can find again is a favourite that was not worth making.
    { href: `${base}/account/saved`, label: dict.saved.heading },
    { href: `${base}/about`, label: dict.footer.about },
  ]

  const secondary = [
    { href: `${base}/guidelines`, label: dict.footer.guidelines },
    { href: `${base}/contact`, label: dict.footer.contact },
  ]

  return (
    <header className="border-line bg-paper/85 supports-[backdrop-filter]:bg-paper/70 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <MobileNav
          links={primary}
          secondary={secondary}
          openLabel={dict.nav.openMenu}
          title={dict.nav.menu}
        />

        <Link href={base} className="flex shrink-0 items-center gap-2">
          <span
            className="rounded-control bg-accent text-accent-ink grid size-8 place-items-center text-sm font-bold"
            aria-hidden
          >
            O
          </span>
          <span className="font-display hidden text-base font-semibold sm:block">
            {dict.meta.title}
          </span>
          {/* The wordmark is display:none below sm and the tile is aria-hidden,
              which left the link with no accessible name (axe: link-name). */}
          <span className="sr-only sm:hidden">{dict.meta.title}</span>
        </Link>

        {/* Compact entry point. The full filter surface lives on /search. */}
        <form action={`${base}/search`} className="ms-auto hidden max-w-sm flex-1 md:block">
          <label htmlFor="header-search" className="sr-only">
            {dict.nav.search}
          </label>
          <div className="relative">
            <Search
              className="text-ink-muted pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder={dict.home.hero.searchPlaceholder}
              className="rounded-pill border-line-strong bg-surface text-ink placeholder:text-ink-muted hover:border-ink-muted h-9 w-full border ps-9 pe-3 text-sm transition-colors duration-(--duration-hover)"
            />
          </div>
        </form>

        <nav aria-label={dict.nav.browse} className="hidden items-center gap-1 md:flex">
          {primary.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control text-ink-muted hover:bg-surface-sunken hover:text-ink px-3 py-2 text-sm font-medium transition-colors duration-(--duration-hover)"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5 md:ms-0">
          {locales.length > 1 && (
            <LocaleSwitcher
              locale={locale}
              label={dict.nav.toggleLanguage}
              options={locales.map((l) => ({ value: l, label: localeMeta[l].label }))}
            />
          )}
          <ThemeToggle label={dict.nav.toggleTheme} />

          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/account`}>
              <User />
              <span className="hidden sm:inline">{dict.account.title}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
