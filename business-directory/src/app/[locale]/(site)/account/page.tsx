import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { interpolate } from '@/lib/i18n-content'
import { authMessages } from '@/lib/auth-messages'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AvatarForm,
  DeleteAccountForm,
  NotificationForm,
  ProfileForm,
} from '@/components/auth/account-forms'
import { SignOutButton } from '@/components/auth/sign-out-button'

/**
 * Account settings.
 *
 * Signed-in only. `requireUser` redirects with a `next` param so the visitor
 * returns here after signing in, and it is the second of three guards — the
 * proxy already refused unauthenticated requests, and RLS refuses the queries.
 */
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = await requireUser(locale, `/${locale}/account`)
  const dict = await getDictionary(locale)
  const messages = authMessages(dict)

  const supabase = await createSupabaseServerClient()
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, locale, phone, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('notification_preferences')
      .select('offers, reviews_on_saved, city_promotions, email_enabled')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display">{dict.account.title}</h1>
          <p className="text-ink-muted mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span>{user.email}</span>
            <Badge variant="neutral">{user.role}</Badge>
            {profile?.created_at && (
              <span>
                {interpolate(dict.account.memberSince, {
                  date: formatDate(profile.created_at, locale),
                })}
              </span>
            )}
          </p>
        </div>
        <SignOutButton locale={locale} label={dict.account.signOut} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.account.avatar}</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarForm
            currentUrl={user.avatarUrl}
            labels={{
              title: dict.account.avatar,
              upload: dict.account.avatarUpload,
              hint: dict.account.avatarHint,
              saved: dict.account.saved,
            }}
            messages={messages}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.account.profile}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            locale={locale}
            defaults={{
              fullName: profile?.full_name ?? '',
              locale: profile?.locale ?? locale,
              phone: profile?.phone ?? '',
            }}
            labels={{
              fullName: dict.auth.fields.fullName,
              phone: dict.account.phone,
              language: dict.account.language,
              submit: dict.account.save,
              saved: dict.account.saved,
            }}
            messages={messages}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.account.notifications}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationForm
            defaults={{
              offers: prefs?.offers ?? true,
              reviewsOnSaved: prefs?.reviews_on_saved ?? true,
              cityPromotions: prefs?.city_promotions ?? false,
              emailEnabled: prefs?.email_enabled ?? true,
            }}
            labels={{
              email: dict.account.notifyEmail,
              reviews: dict.account.notifyReviews,
              offers: dict.account.notifyOffers,
              promotions: dict.account.notifyPromotions,
              submit: dict.account.save,
              saved: dict.account.saved,
            }}
            messages={messages}
          />
        </CardContent>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger text-base">{dict.account.dangerZone}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm
            locale={locale}
            labels={{
              warning: dict.account.deleteWarning,
              confirm: dict.account.deleteConfirm,
              submit: dict.account.deleteSubmit,
            }}
            messages={messages}
          />
        </CardContent>
      </Card>
    </div>
  )
}
