import { notFound } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SuspendedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <Card>
      <CardHeader className="items-start">
        <ShieldAlert className="text-danger size-8" aria-hidden />
        <CardTitle className="text-2xl">{dict.auth.suspended.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-ink-muted">{dict.auth.suspended.body}</p>
      </CardContent>
    </Card>
  )
}
