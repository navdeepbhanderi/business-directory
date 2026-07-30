import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { authMessages } from '@/lib/auth-messages'

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{dict.auth.forgot.title}</CardTitle>
        <CardDescription>{dict.auth.forgot.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm
          locale={locale}
          labels={{
            email: dict.auth.fields.email,
            submit: dict.auth.forgot.submit,
            sent: dict.auth.forgot.sent,
          }}
          messages={authMessages(dict)}
        />
      </CardContent>
    </Card>
  )
}
