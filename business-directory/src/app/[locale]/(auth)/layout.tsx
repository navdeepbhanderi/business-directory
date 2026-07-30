import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'

/**
 * Auth shell. Deliberately not the site shell: a narrow, single-purpose column
 * with no search bar or nav to wander off into mid-signup.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <div className="bg-surface-sunken flex min-h-dvh flex-col">
      <header className="p-6">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2">
          <span
            className="rounded-control bg-accent text-accent-ink grid size-8 place-items-center text-sm font-bold"
            aria-hidden
          >
            O
          </span>
          <span className="font-display text-base font-semibold">{dict.meta.title}</span>
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
