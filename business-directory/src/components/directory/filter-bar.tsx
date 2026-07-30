import Link from 'next/link'
import { Check, Star, X } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries/en'
import {
  PRICE_LEVELS,
  RADIUS_OPTIONS,
  SORT_OPTIONS,
  searchHref,
  toggleValue,
  withChange,
  type SearchState,
} from '@/lib/search-params'
import { interpolate } from '@/lib/i18n-content'
import { formatCount, priceLevelSymbol } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The filter surface.
 *
 * Every control is a plain `<Link>` to a different URL, not a form control
 * bound to component state. That makes the whole thing work without
 * JavaScript, makes every combination shareable, makes the back button behave,
 * and means there is no state to fall out of sync with the URL — which is
 * exactly the bug that broke category browsing in the prototype.
 *
 * The cost is a server round trip per change. For a directory that is the right
 * trade: results come from the database anyway.
 */

export type FilterOption = { value: string; label: string; count?: number }

export type FilterBarData = {
  categories: FilterOption[]
  cities: FilterOption[]
  localities: FilterOption[]
  amenities: FilterOption[]
}

function Chip({
  href,
  active,
  children,
  className,
}: {
  href: string
  active: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'rounded-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors duration-(--duration-hover)',
        active
          ? 'bg-accent text-accent-ink font-medium'
          : 'border-line text-ink-muted hover:border-line-strong hover:text-ink border',
        className,
      )}
    >
      {children}
    </Link>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-line border-t pt-4 first:border-t-0 first:pt-0">
      <legend className="text-eyebrow text-ink-muted mb-3">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

export function FilterPanel({
  state,
  data,
  locale,
  dict,
  className,
}: {
  state: SearchState
  data: FilterBarData
  locale: Locale
  dict: Dictionary
  className?: string
}) {
  const href = (change: Partial<SearchState>) => searchHref(locale, withChange(state, change))

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <Group label={dict.search.openNowFilter}>
        <Chip href={href({ openNow: !state.openNow })} active={state.openNow}>
          {state.openNow && <Check className="size-3.5" aria-hidden />}
          {dict.search.openNowFilter}
        </Chip>
      </Group>

      <Group label={dict.search.category}>
        {data.categories.map((option) => {
          const active = state.categories.includes(option.value)
          return (
            <Chip
              key={option.value}
              active={active}
              href={href({ categories: toggleValue(state.categories, option.value) })}
            >
              {active && <Check className="size-3.5" aria-hidden />}
              {option.label}
            </Chip>
          )
        })}
      </Group>

      <Group label={dict.search.city}>
        {data.cities.map((option) => {
          const active = state.city === option.value
          return (
            <Chip
              key={option.value}
              active={active}
              // Changing city invalidates the locality, which belongs to the old one.
              href={href({ city: active ? null : option.value, locality: null })}
            >
              {active && <Check className="size-3.5" aria-hidden />}
              {option.label}
            </Chip>
          )
        })}
      </Group>

      {/* Localities only exist in the context of a city. */}
      {state.city && data.localities.length > 0 && (
        <Group label={dict.search.locality}>
          {data.localities.map((option) => {
            const active = state.locality === option.value
            return (
              <Chip
                key={option.value}
                active={active}
                href={href({ locality: active ? null : option.value })}
              >
                {active && <Check className="size-3.5" aria-hidden />}
                {option.label}
                {option.count !== undefined && (
                  <span className="num text-xs opacity-70">
                    {formatCount(option.count, locale)}
                  </span>
                )}
              </Chip>
            )
          })}
        </Group>
      )}

      <Group label={dict.search.minRating}>
        {[3, 3.5, 4, 4.5].map((rating) => {
          const active = state.minRating === rating
          return (
            <Chip key={rating} active={active} href={href({ minRating: active ? null : rating })}>
              <Star
                className={cn('size-3.5', active ? 'fill-current' : 'fill-star text-star')}
                aria-hidden
              />
              <span className="num">{rating}+</span>
            </Chip>
          )
        })}
      </Group>

      <Group label={dict.search.priceLevel}>
        {PRICE_LEVELS.map((level) => {
          const active = state.priceLevels.includes(level)
          return (
            <Chip
              key={level}
              active={active}
              href={href({ priceLevels: toggleValue(state.priceLevels, level) })}
            >
              <span className="num">{priceLevelSymbol(level)}</span>
            </Chip>
          )
        })}
      </Group>

      {/* Distance needs an origin, so it is only offered once one is known. */}
      {state.lat !== null && (
        <Group label={dict.search.distance}>
          {RADIUS_OPTIONS.map((radius) => {
            const active = state.radiusKm === radius
            return (
              <Chip key={radius} active={active} href={href({ radiusKm: active ? null : radius })}>
                <span className="num">{interpolate(dict.search.withinKm, { count: radius })}</span>
              </Chip>
            )
          })}
        </Group>
      )}

      {data.amenities.length > 0 && (
        <Group label={dict.search.amenities}>
          {data.amenities.map((option) => {
            const active = state.amenities.includes(option.value)
            return (
              <Chip
                key={option.value}
                active={active}
                href={href({ amenities: toggleValue(state.amenities, option.value) })}
              >
                {active && <Check className="size-3.5" aria-hidden />}
                {option.label}
                {option.count !== undefined && (
                  <span className="num text-xs opacity-70">
                    {formatCount(option.count, locale)}
                  </span>
                )}
              </Chip>
            )
          })}
        </Group>
      )}
    </div>
  )
}

/** Removable chips summarising what is currently applied. */
export function ActiveFilterChips({
  state,
  data,
  locale,
  dict,
}: {
  state: SearchState
  data: FilterBarData
  locale: Locale
  dict: Dictionary
}) {
  const label = (options: FilterOption[], value: string) =>
    options.find((o) => o.value === value)?.label ?? value

  const chips: { key: string; label: string; next: Partial<SearchState> }[] = []

  if (state.q) chips.push({ key: 'q', label: `“${state.q}”`, next: { q: null } })
  if (state.openNow) {
    chips.push({ key: 'open', label: dict.search.openNowFilter, next: { openNow: false } })
  }
  for (const slug of state.categories) {
    chips.push({
      key: `category-${slug}`,
      label: label(data.categories, slug),
      next: { categories: state.categories.filter((c) => c !== slug) },
    })
  }
  if (state.city) {
    chips.push({
      key: 'city',
      label: label(data.cities, state.city),
      next: { city: null, locality: null },
    })
  }
  if (state.locality) {
    chips.push({
      key: 'locality',
      label: label(data.localities, state.locality),
      next: { locality: null },
    })
  }
  if (state.minRating !== null) {
    chips.push({ key: 'rating', label: `${state.minRating}+ ★`, next: { minRating: null } })
  }
  for (const level of state.priceLevels) {
    chips.push({
      key: `price-${level}`,
      label: priceLevelSymbol(level),
      next: { priceLevels: state.priceLevels.filter((p) => p !== level) },
    })
  }
  for (const amenity of state.amenities) {
    chips.push({
      key: `amenity-${amenity}`,
      label: amenity,
      next: { amenities: state.amenities.filter((a) => a !== amenity) },
    })
  }
  if (state.lat !== null) {
    chips.push({
      key: 'near',
      label: state.radiusKm
        ? interpolate(dict.search.withinKm, { count: state.radiusKm })
        : dict.home.hero.nearMe,
      next: { lat: null, lng: null },
    })
  }

  if (chips.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={searchHref(locale, withChange(state, chip.next))}
            className="rounded-pill bg-accent-soft text-accent hover:bg-accent hover:text-accent-ink inline-flex items-center gap-1.5 px-3 py-1 text-sm transition-colors duration-(--duration-hover)"
          >
            {chip.label}
            <X className="size-3.5" aria-hidden />
            <span className="sr-only">{dict.search.removeFilter}</span>
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={searchHref(locale, { ...state, ...ClearedFilters })}
          className="text-ink-muted hover:text-ink text-sm underline-offset-4 hover:underline"
        >
          {dict.search.clearAll}
        </Link>
      </li>
    </ul>
  )
}

/** Everything a "clear all" should reset — deliberately keeps sort. */
const ClearedFilters = {
  q: null,
  categories: [],
  city: null,
  locality: null,
  priceLevels: [],
  amenities: [],
  minRating: null,
  openNow: false,
  lat: null,
  lng: null,
  radiusKm: null,
  page: 1,
} satisfies Partial<SearchState>

export function SortLinks({
  state,
  locale,
  dict,
}: {
  state: SearchState
  locale: Locale
  dict: Dictionary
}) {
  // `nearest` is only offered when an origin exists to measure from.
  const options = SORT_OPTIONS.filter((option) => option !== 'nearest' || state.lat !== null)

  return (
    <nav aria-label={dict.search.sortBy} className="flex flex-wrap items-center gap-2">
      <span className="text-ink-muted text-sm">{dict.search.sortBy}</span>
      {options.map((option) => (
        <Chip
          key={option}
          active={state.sort === option}
          href={searchHref(locale, withChange(state, { sort: option }))}
        >
          {dict.search.sort[option]}
        </Chip>
      ))}
    </nav>
  )
}
