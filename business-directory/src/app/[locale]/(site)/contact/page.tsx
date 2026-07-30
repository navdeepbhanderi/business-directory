import { notFound } from 'next/navigation'
import { Mail } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { Button } from '@/components/ui/button'

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-display">{dict.footer.contact}</h1>

      <div className="text-ink-muted mt-8 flex flex-col gap-5 leading-relaxed">
        <p>
          A contact form with validation and delivery arrives with the rest of the transactional
          email work. Until then, email is the honest option rather than a form that silently
          discards what you write.
        </p>

        <Button asChild variant="outline" className="self-start">
          <a href="mailto:hello@example.com">
            <Mail />
            hello@example.com
          </a>
        </Button>

        <p className="rounded-card border-line bg-surface-sunken border p-4 text-sm">
          {dict.footer.demoNotice}
        </p>
      </div>
    </div>
  )
}
