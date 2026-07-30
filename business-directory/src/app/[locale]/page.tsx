import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Circle, Languages } from 'lucide-react'
import { isLocale, localeMeta, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { ThemeToggle } from '@/components/layout/theme-toggle'

/**
 * Phase 0 scaffold page.
 *
 * Deliberately a status page rather than a mocked-up product surface: the
 * prototype's problem was convincing-looking UI with nothing behind it, and
 * repeating that here would be the same mistake. It doubles as the visual smoke
 * test for the token layer — every semantic color, the type scale, dark mode,
 * and both scripts render here.
 */

const scaffold = [
  { label: 'Next.js 16 · App Router · React 19', done: true },
  { label: 'TypeScript strict · no implicit any', done: true },
  { label: 'Design tokens · light + dark', done: true },
  { label: 'Locale routing · en + hi · RTL-ready', done: true },
  { label: 'Supabase clients · server / browser / admin', done: true },
  { label: 'ESLint · Prettier · Vitest · Playwright', done: true },
  { label: 'CI · lint → typecheck → test → build', done: true },
  { label: 'Phase 1 — schema, RLS, search RPC, seed', done: false },
]

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const dict = await getDictionary(locale)
  const otherLocale = locales.find((l) => l !== locale) ?? locale

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-eyebrow text-ink-muted">{dict.home.hero.eyebrow}</span>
        <div className="flex items-center gap-2">
          <Link
            href={`/${otherLocale}`}
            className="rounded-control border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink inline-flex h-9 items-center gap-2 border px-3 text-sm transition-colors duration-(--duration-hover)"
          >
            <Languages className="size-4" />
            {localeMeta[otherLocale].label}
          </Link>
          <ThemeToggle label={dict.nav.toggleTheme} />
        </div>
      </header>

      <main id="main" className="flex flex-1 flex-col justify-center py-16">
        <h1 className="text-display-lg max-w-xl">{dict.home.hero.title}</h1>
        <p className="text-ink-muted mt-6 max-w-lg text-lg leading-relaxed">
          {dict.home.hero.subtitle}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="rounded-pill bg-success-soft text-success inline-flex items-center gap-2 px-3 py-1 text-sm font-medium">
            <span className="rounded-pill bg-success size-1.5" />
            {dict.common.openNow}
          </span>
          <span className="rounded-pill bg-accent-soft text-accent inline-flex items-center gap-2 px-3 py-1 text-sm font-medium">
            {dict.common.verified}
          </span>
          <span className="num text-ink-muted text-sm">4.5 · 127 {dict.common.reviews}</span>
        </div>

        <section className="rounded-card border-line bg-surface shadow-card mt-14 border p-6">
          <span className="text-eyebrow text-accent">{dict.home.scaffold.eyebrow}</span>
          <h2 className="mt-2 text-2xl">{dict.home.scaffold.title}</h2>
          <p className="text-ink-muted mt-2">{dict.home.scaffold.body}</p>

          <ul className="border-line mt-6 grid gap-2 border-t pt-5">
            {scaffold.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                {item.done ? (
                  <Check className="text-success size-4 shrink-0" aria-hidden />
                ) : (
                  <Circle className="text-ink-muted size-4 shrink-0" aria-hidden />
                )}
                <span className={item.done ? 'text-ink' : 'text-ink-muted'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
