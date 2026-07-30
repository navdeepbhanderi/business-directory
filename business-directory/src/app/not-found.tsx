import Link from 'next/link'
import { defaultLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { ThemeScript } from '@/components/layout/theme-script'
import './globals.css'

/**
 * Root-level 404. Renders its own <html> because the root layout is a
 * passthrough and an unmatched path has no locale segment to read.
 */
export default async function NotFound() {
  const dict = await getDictionary(defaultLocale)

  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-paper text-ink grid min-h-dvh place-items-center px-6 antialiased">
        <div className="max-w-md text-center">
          <p className="text-eyebrow text-ink-muted">404</p>
          <h1 className="text-display mt-3">{dict.common.notFound.title}</h1>
          <p className="text-ink-muted mt-4">{dict.common.notFound.body}</p>
          <Link
            href={`/${defaultLocale}`}
            className="rounded-control bg-accent text-accent-ink hover:bg-accent-hover mt-8 inline-flex h-10 items-center px-5 text-sm font-medium transition-colors duration-(--duration-hover)"
          >
            {dict.common.notFound.cta}
          </Link>
        </div>
      </body>
    </html>
  )
}
