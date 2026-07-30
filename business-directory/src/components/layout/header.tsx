import Link from 'next/link'
import { Search } from 'lucide-react'
import { localeMeta, locales, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries/en'
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
export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`

  const primary = [
    { href: `${base}/search`, label: dict.nav.search },
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
        </div>
      </div>
    </header>
  )
}
