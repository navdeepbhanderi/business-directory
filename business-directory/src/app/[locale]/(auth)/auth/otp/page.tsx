import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { safeReturnTo } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OtpForm } from '@/components/auth/otp-form'
import { authMessages } from '@/lib/auth-messages'

export default async function OtpPage({
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
  const nextRaw = Array.isArray(query.next) ? query.next[0] : query.next

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{dict.auth.otp.title}</CardTitle>
        <CardDescription>{dict.auth.otp.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <OtpForm
          locale={locale}
          next={nextRaw ? safeReturnTo(nextRaw, locale) : undefined}
          labels={{
            phoneLabel: dict.auth.otp.phoneLabel,
            phoneHint: dict.auth.otp.phoneHint,
            request: dict.auth.otp.request,
            codeLabel: dict.auth.otp.codeLabel,
            verify: dict.auth.otp.verify,
            sent: dict.auth.otp.sent,
            resend: dict.auth.otp.resend,
          }}
          messages={authMessages(dict)}
        />
      </CardContent>
    </Card>
  )
}
