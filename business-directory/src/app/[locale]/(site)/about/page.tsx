import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-display">{dict.footer.about}</h1>

      <div className="text-ink-muted mt-8 flex flex-col gap-5 leading-relaxed">
        <p className="text-ink text-lg">{dict.footer.tagline}</p>
        <p>
          Local search in India is fragmented. Opening hours are stale, listings are unclaimed, and
          reviews are hard to trust. This directory is an attempt at the opposite: verified
          listings, hours that account for split shifts and festival closures, and reviews tied to
          real accounts with a moderation trail behind them.
        </p>
        <p>
          Business owners can claim a listing, correct what is published about them, and reply to
          reviews — but not edit their own rating or verification status. Those boundaries are
          enforced in the database rather than the interface, so they hold regardless of what the
          app does.
        </p>
        <p className="rounded-card border-line bg-surface-sunken border p-4 text-sm">
          {dict.footer.demoNotice}
        </p>
      </div>
    </div>
  )
}
