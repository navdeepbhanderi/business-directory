'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type NavLink = { href: string; label: string }

/**
 * Mobile navigation.
 *
 * The prototype shipped a hamburger button with no handler — there was no
 * mobile navigation at all. Radix supplies the focus trap and scroll lock;
 * closing on navigation is ours, because Next's client router does not unmount
 * the sheet on its own.
 */
export function MobileNav({
  links,
  secondary,
  openLabel,
  title,
  footer,
}: {
  links: NavLink[]
  secondary?: NavLink[]
  openLabel: string
  title: string
  footer?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={openLabel} className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent side="start" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-control text-ink px-3 py-2.5 text-base font-medium',
                'hover:bg-surface-sunken transition-colors duration-(--duration-hover)',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {secondary && secondary.length > 0 && (
          <nav className="border-line mt-2 flex flex-col gap-1 border-t px-3 pt-4">
            {secondary.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-control text-ink-muted hover:bg-surface-sunken hover:text-ink px-3 py-2 text-sm transition-colors duration-(--duration-hover)"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {footer && <div className="border-line mt-auto border-t p-5">{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}
