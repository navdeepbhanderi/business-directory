import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

/**
 * Public shell. Anything a visitor browses sits inside this group so the header
 * and footer are guaranteed present — including the 404, which in the prototype
 * rendered bare with no way back.
 */
export default async function SiteLayout({
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
    <div className="flex min-h-dvh flex-col">
      <Header locale={locale} dict={dict} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer locale={locale} dict={dict} />
    </div>
  )
}
