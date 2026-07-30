import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { GoogleButton } from '@/components/auth/oauth-buttons'
import { authMessages } from '@/lib/auth-messages'

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{dict.auth.signUp.title}</CardTitle>
        <CardDescription>{dict.auth.signUp.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <SignUpForm
          locale={locale}
          labels={{
            fullName: dict.auth.fields.fullName,
            email: dict.auth.fields.email,
            password: dict.auth.fields.password,
            passwordHint: dict.auth.fields.passwordHint,
            submit: dict.auth.signUp.submit,
          }}
          messages={authMessages(dict)}
        />

        <div className="flex items-center gap-3">
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-muted text-xs">{dict.auth.signIn.orContinue}</span>
          <span className="bg-line h-px flex-1" />
        </div>

        <GoogleButton
          locale={locale}
          label={dict.auth.signIn.google}
          errorLabel={dict.auth.errors.failed}
        />

        <p className="text-ink-muted text-xs">
          {dict.auth.signUp.terms}{' '}
          <Link
            href={`/${locale}/guidelines`}
            className="text-accent underline-offset-4 hover:underline"
          >
            {dict.footer.guidelines}
          </Link>
        </p>

        <p className="text-ink-muted text-sm">
          {dict.auth.signUp.haveAccount}{' '}
          <Link
            href={`/${locale}/auth/sign-in`}
            className="text-accent underline-offset-4 hover:underline"
          >
            {dict.auth.signUp.signInInstead}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
