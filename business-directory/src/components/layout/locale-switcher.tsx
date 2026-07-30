'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { setLocaleCookie } from '@/lib/locale-cookie'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

/**
 * Switches locale while staying on the current page.
 *
 * Swaps only the leading path segment, so `/en/search?q=chai` becomes
 * `/hi/search?q=chai` rather than dumping the visitor back on the home page —
 * losing someone's place is a small thing that reads as carelessness.
 *
 * Also writes the preference cookie the proxy reads, so the choice survives a
 * later visit to the bare root.
 */
export function LocaleSwitcher({
  locale,
  label,
  options,
}: {
  locale: Locale
  label: string
  options: { value: Locale; label: string }[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  function switchTo(next: Locale) {
    if (next === locale) return

    setLocaleCookie(next)

    const segments = pathname.split('/')
    // segments[0] is always '' because the path starts with a slash.
    segments[1] = next
    const search = typeof window === 'undefined' ? '' : window.location.search
    router.push(`${segments.join('/')}${search}`)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={label}>
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => switchTo(option.value)}
            aria-current={option.value === locale ? 'true' : undefined}
            className={option.value === locale ? 'text-accent font-semibold' : undefined}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
