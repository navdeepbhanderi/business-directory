import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { safeReturnTo } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignInForm } from '@/components/auth/sign-in-form'
import { GoogleButton } from '@/components/auth/oauth-buttons'
import { authMessages } from '@/lib/auth-messages'

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const query = await searchParams
  const dict = await getDictionary(locale)
  const nextRaw = Array.isArray(query.next) ? query.next[0] : query.next
  const next = nextRaw ? safeReturnTo(nextRaw, locale) : undefined
  const linkError = Array.isArray(query.error) ? query.error[0] : query.error

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{dict.auth.signIn.title}</CardTitle>
        <CardDescription>{dict.auth.signIn.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {linkError && (
          <p
            role="alert"
            className="rounded-control border-danger/40 bg-danger-soft text-danger border p-3 text-sm"
          >
            {dict.auth.errors.link}
          </p>
        )}

        <SignInForm
          locale={locale}
          next={next}
          labels={{
            email: dict.auth.fields.email,
            password: dict.auth.fields.password,
            submit: dict.auth.signIn.submit,
            forgot: dict.auth.signIn.forgot,
          }}
          messages={authMessages(dict)}
        />

        <div className="flex items-center gap-3">
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-muted text-xs">{dict.auth.signIn.orContinue}</span>
          <span className="bg-line h-px flex-1" />
        </div>

        <div className="flex flex-col gap-2">
          <GoogleButton
            locale={locale}
            label={dict.auth.signIn.google}
            next={next}
            errorLabel={dict.auth.errors.failed}
          />
          <Link
            href={`/${locale}/auth/otp`}
            className="rounded-control border-line-strong text-ink hover:border-ink-muted border px-4 py-2 text-center text-sm transition-colors duration-(--duration-hover)"
          >
            {dict.auth.signIn.phone}
          </Link>
        </div>

        <p className="text-ink-muted text-sm">
          {dict.auth.signIn.noAccount}{' '}
          <Link
            href={`/${locale}/auth/sign-up`}
            className="text-accent underline-offset-4 hover:underline"
          >
            {dict.auth.signIn.createOne}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
