import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Fraunces, Inter, Noto_Sans_Devanagari } from 'next/font/google'
import { isLocale, locales, localeDirection, localeMeta } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { siteUrl } from '@/lib/env'
import { ThemeScript } from '@/components/layout/theme-script'
import '../globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

// Devanagari for Hindi. Each additional script gets its own subset-scoped
// face rather than one giant multi-script file — see docs/DESIGN.md.
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-devanagari',
  display: 'swap',
})

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}

  const dict = await getDictionary(locale)

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: dict.meta.title,
      template: `%s · ${dict.meta.title}`,
    },
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [localeMeta[l].tag, `/${l}`])),
    },
    openGraph: {
      type: 'website',
      siteName: dict.meta.title,
      title: dict.meta.title,
      description: dict.meta.description,
      locale: localeMeta[locale].tag,
      url: `/${locale}`,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({
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
    <html
      lang={localeMeta[locale].tag}
      dir={localeDirection(locale)}
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${devanagari.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-paper text-ink min-h-dvh antialiased">
        <a
          href="#main"
          className="focus:rounded-control focus:bg-surface focus:shadow-float sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2"
        >
          {dict.nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  )
}
