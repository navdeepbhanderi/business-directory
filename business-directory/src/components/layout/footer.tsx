import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries/en'

/**
 * Footer.
 *
 * Only real destinations. The prototype's footer pointed at `/about` and
 * `/contact`, neither of which existed, and both landed on a 404 rendered
 * outside the site layout with no way back.
 */
export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`
  const year = 2026

  const columns = [
    {
      heading: dict.footer.browse,
      links: [
        { href: `${base}/search`, label: dict.nav.search },
        { href: `${base}/about`, label: dict.footer.about },
      ],
    },
    {
      heading: dict.footer.about,
      links: [
        { href: `${base}/guidelines`, label: dict.footer.guidelines },
        { href: `${base}/contact`, label: dict.footer.contact },
      ],
    },
  ]

  return (
    <footer className="border-line bg-surface-sunken mt-auto border-t">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href={base} className="flex items-center gap-2">
              <span
                className="rounded-control bg-accent text-accent-ink grid size-8 place-items-center text-sm font-bold"
                aria-hidden
              >
                O
              </span>
              <span className="font-display text-base font-semibold">{dict.meta.title}</span>
            </Link>
            <p className="text-ink-muted mt-3 text-sm">{dict.footer.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            {columns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <h2 className="text-eyebrow text-ink">{column.heading}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-ink-muted hover:text-ink text-sm transition-colors duration-(--duration-hover)"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Stated plainly rather than buried: the data here is fabricated. */}
        <p className="rounded-card border-line bg-surface text-ink-muted mt-10 border px-4 py-3 text-xs">
          {dict.footer.demoNotice}
        </p>

        <p className="text-ink-muted mt-6 text-xs">
          © {year} {dict.meta.title}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  )
}
