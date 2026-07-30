/**
 * English is the source of truth for the dictionary shape.
 *
 * Access is by property (`dict.home.hero.title`), never by string path. That
 * makes a missing or misspelled key a compile error rather than a silent
 * fallback — the prototype's `t()` returned the raw key on a miss with no
 * warning, which is how half the UI stayed untranslated without anyone noticing.
 */
export const en = {
  meta: {
    title: 'India Business Directory',
    description:
      'Find and review restaurants, clinics, shops and services across India — verified listings, real opening hours, and reviews from people who actually went.',
  },
  nav: {
    home: 'Home',
    search: 'Search',
    pricing: 'Pricing',
    signIn: 'Sign in',
    signUp: 'Sign up',
    forBusiness: 'For business',
    skipToContent: 'Skip to content',
    toggleTheme: 'Toggle theme',
    toggleLanguage: 'Switch language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  home: {
    hero: {
      eyebrow: 'India',
      title: 'Find places worth your time.',
      subtitle: 'Verified listings, real opening hours, and reviews from people who actually went.',
      searchPlaceholder: 'Search restaurants, clinics, services…',
      searchButton: 'Search',
      nearMe: 'Near me',
    },
    scaffold: {
      eyebrow: 'Phase 0',
      title: 'Foundation in place.',
      body: 'Next.js, the token layer, and the toolchain are wired. The database, search, and listings land next.',
      checklist: 'Scaffold checklist',
    },
  },
  common: {
    loading: 'Loading…',
    retry: 'Try again',
    openNow: 'Open now',
    closed: 'Closed',
    reviews: 'reviews',
    verified: 'Verified',
    error: {
      title: 'Something went wrong',
      body: 'That request did not complete. Please try again.',
    },
    notFound: {
      title: 'Page not found',
      body: 'The page you are looking for does not exist or has moved.',
      cta: 'Back to home',
    },
  },
} as const

/**
 * Widens the literal types from `as const` back to `string`, so other locales
 * must match the *shape* of `en` without matching its English values.
 *
 * The practical effect: adding a key to `en` and forgetting it in another
 * locale fails `tsc`. Translation parity is a compile-time guarantee, not a
 * lint rule — which matters a great deal more once there are eight locales.
 */
type LocaleShape<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : LocaleShape<T[K]>
}

/** The contract every other locale must satisfy. */
export type Dictionary = LocaleShape<typeof en>
