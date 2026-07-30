import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { authMessages } from '@/lib/auth-messages'

export default async function ResetPasswordPage({
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
        <CardTitle className="text-2xl">{dict.auth.reset.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm
          locale={locale}
          labels={{
            password: dict.auth.fields.password,
            confirm: dict.auth.reset.confirmLabel,
            submit: dict.auth.reset.submit,
          }}
          messages={authMessages(dict)}
        />
      </CardContent>
    </Card>
  )
}
