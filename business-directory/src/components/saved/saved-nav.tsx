import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Places · Lists · Searches.
 *
 * Links rather than tab state, so each section is its own URL: shareable,
 * bookmarkable, and back does what it should. Three saved things need three
 * places, not one page with hidden panels.
 */
export function SavedNav({
  locale,
  active,
  labels,
}: {
  locale: string
  active: 'places' | 'lists' | 'searches'
  labels: { places: string; lists: string; searches: string }
}) {
  const items = [
    { key: 'places' as const, href: `/${locale}/account/saved`, label: labels.places },
    { key: 'lists' as const, href: `/${locale}/account/lists`, label: labels.lists },
    { key: 'searches' as const, href: `/${locale}/account/searches`, label: labels.searches },
  ]

  return (
    <nav className="border-line flex gap-1 border-b">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-(--duration-hover)',
            active === item.key
              ? 'border-accent text-ink'
              : 'text-ink-muted hover:text-ink border-transparent',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
