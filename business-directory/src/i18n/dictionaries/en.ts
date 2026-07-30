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
    title: 'Openly',
    description:
      'Find and review businesses across India — verified listings, opening hours you can rely on, and reviews from people who actually went.',
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
    menu: 'Menu',
    browse: 'Browse',
  },
  home: {
    hero: {
      eyebrow: 'India',
      title: 'Find businesses worth your time.',
      subtitle: 'Verified listings, real opening hours, and reviews from people who actually went.',
      searchPlaceholder: 'Search restaurants, clinics, services…',
      searchButton: 'Search',
      nearMe: 'Near me',
    },
    categories: {
      eyebrow: 'Browse',
      title: 'What are you looking for?',
      description: 'Every category, across six cities.',
    },
    cities: {
      eyebrow: 'Cities',
      title: 'Where are you?',
      description: 'Pick a city to see what is nearby and open right now.',
    },
    stats: {
      listings: 'Listings',
      cities: 'Cities',
      categories: 'Categories',
      reviews: 'Reviews',
    },
    featured: {
      eyebrow: 'Worth a look',
      title: 'Highly rated near you',
      description: 'Listings with consistently strong reviews from real visitors.',
      viewAll: 'View all listings',
    },
  },
  business: {
    verified: 'Verified',
    promoted: 'Promoted',
    reviews: 'reviews',
    openNow: 'Open',
    closed: 'Closed',
    closingSoon: 'Closing soon',
    hoursUnknown: 'Hours not listed',
    closesAt: 'closes {time}',
    opensAt: 'opens {time}',
    opensOn: 'opens {day} at {time}',
    today: 'Today',
    hours: 'Opening hours',
    amenitiesMore: '+{count} more',
    call: 'Call',
    directions: 'Directions',
    website: 'Website',
    share: 'Share',
    save: 'Save',
    ratingOf: '{rating} out of 5',
    starCount: '{count} star',
    starCountPlural: '{count} stars',
  },
  search: {
    resultsFor: 'Results for “{query}”',
    allListings: 'All listings',
    resultCount: '{count} listing',
    resultCountPlural: '{count} listings',
    filters: 'Filters',
    clearAll: 'Clear all',
    sortBy: 'Sort by',
    sort: {
      relevance: 'Most relevant',
      rating: 'Highest rated',
      reviews: 'Most reviewed',
      nearest: 'Nearest',
      newest: 'Newest',
    },
    openNowFilter: 'Open now',
    minRating: 'Minimum rating',
    priceLevel: 'Price',
    distance: 'Distance',
    category: 'Category',
    city: 'City',
    empty: {
      title: 'No listings match those filters',
      body: 'Try widening the distance, lowering the minimum rating, or clearing a filter.',
      action: 'Clear all filters',
    },
  },
  footer: {
    tagline: 'Open hours, honest reviews. A directory of local businesses across India.',
    browse: 'Browse',
    forBusiness: 'For business',
    about: 'About',
    claimListing: 'Claim your listing',
    addListing: 'Add a business',
    plans: 'Plans and pricing',
    howItWorks: 'How it works',
    guidelines: 'Review guidelines',
    contact: 'Contact',
    demoNotice:
      'Demonstration project. Listings, reviews, and accounts are fictional and do not describe real businesses.',
    rights: 'All rights reserved.',
  },
  common: {
    loading: 'Loading…',
    retry: 'Try again',
    reviews: 'reviews',
    verified: 'Verified',
    openNow: 'Open now',
    closed: 'Closed',
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
