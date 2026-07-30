# Enabling authentication — what you need to do

Phase 5 wired every auth path in the codebase. Three of them need credentials or
accounts that only you can create, so they cannot be finished from inside the
repo. This is that list, with a way to prove each one works.

**Status legend**

|     | Meaning                                                     |
| --- | ----------------------------------------------------------- |
| ✅  | Working now, verified locally, nothing for you to do        |
| 🔑  | Code is complete; needs a credential or an account from you |
| ⏳  | Needs a credential **and** has an external lead time        |

| Capability                         | Local | Production | Needs from you                             |
| ---------------------------------- | ----- | ---------- | ------------------------------------------ |
| Email + password sign-up           | ✅    | 🔑         | Production SMTP                            |
| Email confirmation link            | ✅    | 🔑         | Production SMTP                            |
| Password reset                     | ✅    | 🔑         | Production SMTP                            |
| Session refresh, guards, RLS       | ✅    | ✅         | Nothing                                    |
| Account settings, avatar, deletion | ✅    | ✅         | Nothing                                    |
| Google sign-in                     | 🔑    | 🔑         | Google OAuth client                        |
| Phone OTP                          | 🔑    | ⏳         | SMS provider **+ Indian DLT registration** |

Everything marked ✅ is covered by the e2e suite, including a real signup →
emailed confirmation link → session round trip read out of the local Mailpit
inbox. The 🔑 rows are wired end to end and fail with an explicit message rather
than silently, but I have not seen either complete a real round trip.

---

## 1. Google sign-in

**Roughly 15 minutes.** No lead time.

### Create the OAuth client

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and either
   pick a project or create one.
2. **APIs & Services → OAuth consent screen.** Choose _External_, fill in the app
   name, your support email, and a logo. While the app is in _Testing_ only
   accounts you list as test users can sign in, which is fine for development —
   publish it before real signups.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
   Application type _Web application_.
4. Under **Authorised redirect URIs**, add the Supabase callback — note this is
   Supabase's URL, **not** your app's:

   ```
   http://127.0.0.1:54321/auth/v1/callback          # local
   https://<your-project-ref>.supabase.co/auth/v1/callback   # production
   ```

   This is the single most common thing to get wrong. Google redirects to
   _Supabase_, and Supabase then redirects to the app's
   `/{locale}/auth/callback` route, which is already built.

5. Copy the **client ID** and **client secret**.

### Wire it up locally

`supabase/config.toml` has no Google block yet — only Apple is templated. Add
this, mirroring the existing shape:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
# Never commit the secret. Environment substitution only.
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = ""
skip_nonce_check = false
```

Then put the values in `.env.local` (already git-ignored):

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="…apps.googleusercontent.com"
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="GOCSPX-…"
```

**Restart the stack — this is not optional:**

```bash
npx supabase stop && npx supabase start
```

`npm run db:reset` does **not** reload `config.toml`. I lost time to exactly this
during Phase 5: an edit appeared to apply, the database reset cleanly, and the
setting was still off.

### Wire it up in production

Supabase Dashboard → **Authentication → Providers → Google**: enable it and paste
the same client ID and secret. Dashboard settings are independent of
`config.toml`, which only governs local development.

### Prove it works

```bash
npm run dev
# open http://localhost:3000/en/auth/sign-in
# click "Continue with Google"
```

Expected: Google's consent screen, then a return to `/en/account` signed in.

If it fails, the button reports it in place rather than hanging —
[oauth-buttons.tsx](../src/components/auth/oauth-buttons.tsx) surfaces the error
deliberately, because a dead button is worse than an honest failure.

---

## 2. Production email

**Roughly 30 minutes**, plus DNS propagation.

Supabase's built-in email sender is **rate-limited to a handful of messages per
hour and is not intended for production**. Without your own SMTP, real signups
will silently stop receiving confirmation links once you cross that limit — the
worst possible failure, because signup will look like it worked.

Locally nothing is needed: all mail lands in Mailpit at
<http://127.0.0.1:54324>, and the e2e suite reads it.

### Pick a sender

[Resend](https://resend.com) is the simplest and is already the plan's choice for
transactional email in Phase 9, so using it here avoids a second provider later.
SendGrid, Postmark, and Amazon SES all work the same way.

1. Create the account and **verify your sending domain** — add the DKIM and SPF
   records they give you to your DNS. Unverified domains land in spam.
2. Create an API key.

### Configure it

Production, Supabase Dashboard → **Project Settings → Authentication → SMTP
Settings**:

| Field        | Resend value                                    |
| ------------ | ----------------------------------------------- |
| Host         | `smtp.resend.com`                               |
| Port         | `587`                                           |
| Username     | `resend`                                        |
| Password     | your API key                                    |
| Sender email | `hello@yourdomain.com` (on the verified domain) |
| Sender name  | `Openly`                                        |

For local development, uncomment the block in `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "hello@yourdomain.com"
sender_name = "Openly"
```

Then restart the stack. Only do this if you specifically want to test real
delivery — Mailpit is faster and does not consume quota.

### Also raise the rate limits

Dashboard → **Authentication → Rate Limits**. The defaults are tuned for the
built-in sender and are lower than you want once you have your own.

### Prove it works

Sign up with a real address you control and confirm the link arrives, renders
correctly, and lands you signed in. Check the spam folder too — if it went there,
your DKIM or SPF records are wrong.

---

## 3. Phone OTP — read this before starting

**This is the one with a real lead time. Days to weeks, not minutes.**

Sending transactional SMS to Indian numbers requires **DLT registration** under
the TRAI mandate. There is no way around it: unregistered messages to Indian
numbers are blocked by the carriers, not merely deprioritised.

What that involves:

1. Register your business entity on a DLT portal run by one of the operators
   (Jio, Airtel, Vi, or BSNL). Requires company documents such as GST or CIN.
2. Register a **sender ID** (a six-character header, e.g. `OPENLY`).
3. Register the **message template** you will send, with variables marked:
   `Your Openly code is {#var#}. Do not share it.`
4. Wait for approval at each step. Template approval alone commonly takes several
   working days, and templates are rejected for small mismatches.

Your SMS provider (Twilio, MSG91, Kaleyra) will guide this, but **the timeline is
not under their control or yours**. Start it early if phone sign-in matters, and
treat email as the primary path until it clears.

### Provider setup, once DLT is approved

Twilio, as an example — Supabase also supports MessageBird, Vonage, and Textlocal:

1. Buy a number capable of sending to India, or use a registered alphanumeric
   sender ID.
2. Create a **Messaging Service** and note its SID.
3. Collect the Account SID and Auth Token.

`supabase/config.toml`:

```toml
[auth.sms]
enable_signup = true
enable_confirmations = true
template = "Your Openly code is {{ `{{ .Code }}` }}. Do not share it."
max_frequency = "60s"

[auth.sms.twilio]
enabled = true
account_sid = "AC…"
message_service_sid = "MG…"
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"
```

Two things to get right:

- The `template` must **match your approved DLT template exactly**, including
  punctuation. A mismatch is rejected by the carrier, not by Twilio, so it looks
  like a silently lost message.
- `max_frequency = "60s"` rather than the default `5s`. SMS costs real money per
  message and a resend button is an obvious abuse target.

Production: Dashboard → **Authentication → Providers → Phone**.

### Testing without spending money or waiting for DLT

`config.toml` supports a fixed number-to-code map. Uncomment and use it:

```toml
[auth.sms.test_otp]
9825010101 = "123456"
```

That lets you exercise the whole two-step OTP flow — including
[otp-form.tsx](../src/components/auth/otp-form.tsx) and `verifyOtpAction` —
without a provider. It is the right way to test the code path; it proves nothing
about delivery.

### Current behaviour with nothing configured

`/en/auth/otp` accepts a number, validates the format strictly (`+91` followed by
a 10-digit number starting 6–9), and then reports _"Phone sign-in is not
available yet. Use email instead."_ That is deliberate: the alternative was a
button that appears to work and quietly does nothing.

---

## 4. Going to production — checklist

Beyond the three above, these are needed once and are easy to forget.

### Supabase project

- [ ] Create the cloud project; note the **project ref**.
- [ ] `npx supabase link --project-ref <ref>`
- [ ] `npx supabase db push` — applies all 15 migrations.
- [ ] **Enable the access-token hook.** Dashboard → **Authentication → Hooks →
      Custom Access Token**, pointing at `public.custom_access_token_hook`.
      `config.toml` only registers it locally. **Without this, `auth_role()` falls
      back to a per-request database lookup** — everything still works and RLS
      still holds, but you lose the property that makes the policy set
      non-recursive. Do not skip it.
- [ ] Set **Site URL** to `https://yourdomain.com` under Authentication → URL
      Configuration.
- [ ] Add to **Redirect URLs**:
      `     https://yourdomain.com/**
  https://<preview-deployments>.vercel.app/**
  `
      Missing these is the second most common OAuth failure after the Google
      callback URI. Supabase refuses to redirect anywhere unlisted, which is
      correct and unhelpful-looking.
- [ ] Confirm `minimum_password_length` matches
      [`MIN_PASSWORD_LENGTH`](../src/lib/auth-schemas.ts) — currently **10**. They
      are enforced in two places and will drift silently: the client would accept
      a password the server then rejects.

### Vercel

Environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="…"        # safe to expose; RLS is the boundary
SUPABASE_SERVICE_ROLE_KEY="…"            # NEVER prefix with NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
```

- [ ] `NEXT_PUBLIC_SITE_URL` must be set. Canonical URLs, `hreflang`, the sitemap,
      and OG image URLs are all built from it, so getting it wrong is an SEO
      problem rather than a visible one.
- [ ] Node version **22 or later**. `@supabase/supabase-js` requires it and Node
      20 is end-of-life.
- [ ] Storage: the `avatars` bucket is created by migration, so nothing manual —
      but check Dashboard → Storage shows it as public with a 2 MB limit and four
      policies.

---

## 5. Verifying the whole thing

Run in order. Each step assumes the previous passed.

```bash
# 1. Everything that needs no credentials
npm run verify        # lint, typecheck, 121 unit tests, build
npm run db:test       # 68 pgTAP assertions, including the auth policies
npm run test:e2e      # 66 tests, incl. real signup + emailed confirmation
```

Then by hand, against production:

| Check                                     | Expected                                                      |
| ----------------------------------------- | ------------------------------------------------------------- |
| Sign up with a real address               | Confirmation email arrives, not in spam                       |
| Click the link                            | Lands signed in at `/en/account`                              |
| Sign out, sign in again                   | Works; session survives a refresh                             |
| Wait an hour, reload                      | Still signed in — proves the proxy refresh works              |
| Wrong password                            | _"Email or password is incorrect."_ — never "no such account" |
| Password reset for a non-existent address | Still reports success (deliberate)                            |
| Visit `/en/admin` as a normal user        | Redirected, not shown an empty page                           |
| Google sign-in                            | Consent screen → signed in                                    |
| Upload an avatar                          | Appears; the object path starts with your user id             |
| Delete the account                        | Signed out; owned listings become unclaimed, not deleted      |

---

## Things that will waste your time if you do not know them

Collected from actually hitting them.

1. **`config.toml` changes need `npx supabase stop && npx supabase start`.**
   `db reset` resets the database and reloads _migrations_, not config. A setting
   can appear applied while the running container never saw it.
2. **Google's redirect URI is Supabase's URL, not your app's.** Your app's
   `/{locale}/auth/callback` is the second hop.
3. **Redirect URLs must be allowlisted in Supabase** or the callback silently
   bounces to sign-in with `?error=`.
4. **The built-in email sender will stop working under real load** and looks like
   nothing is wrong.
5. **India requires DLT registration for SMS.** Not a formality, not skippable,
   and it gates the entire OTP feature.
6. **Password length is enforced twice** — Supabase config and `auth-schemas.ts`.
   Keep them equal.
7. **Enable the access-token hook in the cloud dashboard.** Easy to miss because
   local development works without touching the dashboard at all.

## Where the code lives

| Concern                  | File                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Session refresh          | [src/lib/supabase/proxy-session.ts](../src/lib/supabase/proxy-session.ts)                                           |
| Guards and role checks   | [src/lib/auth.ts](../src/lib/auth.ts), [src/proxy.ts](../src/proxy.ts)                                              |
| Validation               | [src/lib/auth-schemas.ts](../src/lib/auth-schemas.ts)                                                               |
| Auth actions             | [src/lib/actions/auth.ts](../src/lib/actions/auth.ts)                                                               |
| Account actions          | [src/lib/actions/account.ts](../src/lib/actions/account.ts)                                                         |
| OAuth callback           | `src/app/[locale]/(auth)/auth/callback/route.ts`                                                                    |
| Open-redirect guard      | [src/lib/return-to.ts](../src/lib/return-to.ts)                                                                     |
| Avatar bucket + policies | [supabase/migrations/20260730125000_avatars_storage.sql](../supabase/migrations/20260730125000_avatars_storage.sql) |
| Access-token hook        | [supabase/migrations/20260730120200_profiles.sql](../supabase/migrations/20260730120200_profiles.sql)               |
