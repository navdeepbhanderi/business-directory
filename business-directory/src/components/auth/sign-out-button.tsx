import { LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth'
import type { Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'

/**
 * A form, not a link. Signing out mutates state, so it must be a POST — a GET
 * link would let any page log a visitor out with an <img src>.
 */
export function SignOutButton({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form action={signOutAction}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="outline" size="sm">
        <LogOut />
        {label}
      </Button>
    </form>
  )
}
