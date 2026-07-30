import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { interpolate } from '@/lib/i18n-content'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)
  const query = await searchParams
  const email = (Array.isArray(query.email) ? query.email[0] : query.email) ?? ''

  return (
    <Card>
      <CardHeader className="items-start">
        <MailCheck className="text-accent size-8" aria-hidden />
        <CardTitle className="text-2xl">{dict.auth.verifyEmail.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-ink-muted">{interpolate(dict.auth.verifyEmail.body, { email })}</p>
        <p className="text-ink-muted text-sm">{dict.auth.verifyEmail.spam}</p>
        <Link
          href={`/${locale}/auth/sign-in`}
          className="text-accent text-sm underline-offset-4 hover:underline"
        >
          {dict.auth.verifyEmail.backToSignIn}
        </Link>
      </CardContent>
    </Card>
  )
}
