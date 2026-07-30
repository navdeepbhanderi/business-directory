import { Clock } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { formatTime, weekdayName } from '@/lib/format'
import { interpolate } from '@/lib/i18n-content'
import { getOpenState, groupWeek, type HourSlot, type HoursOverride } from '@/lib/hours'
import { cn } from '@/lib/utils'

/**
 * Templates rather than callbacks, so this component stays usable from a
 * Server Component. Placeholders are `{time}` and `{day}`.
 */
export type OpenNowLabels = {
  open: string
  closed: string
  unknown: string
  closesAt: string
  opensAt: string
  opensOn: string
  closingSoon: string
}

/**
 * Live open/closed state.
 *
 * Deliberately says more than "Open": at 22:20 the useful answer is "Closes
 * 10:30 pm", and when shut it is "Opens 9:00 am". The prototype rendered a
 * hardcoded green "Open now" on every card regardless of the hours beside it.
 */
export function OpenNowBadge({
  slots,
  overrides,
  locale,
  labels,
  at,
  className,
}: {
  slots: HourSlot[]
  overrides?: HoursOverride[]
  locale: Locale
  labels: OpenNowLabels
  /** Injectable for tests and for server rendering at a known instant. */
  at?: Date
  className?: string
}) {
  const state = getOpenState({ slots, overrides: overrides ?? [], at })

  const base = 'inline-flex items-center gap-1.5 text-sm font-medium'

  if (state.status === 'unknown') {
    return (
      <span className={cn(base, 'text-ink-muted', className)}>
        <Clock className="size-3.5" aria-hidden />
        {labels.unknown}
      </span>
    )
  }

  if (state.status === 'open' || state.status === 'closing-soon') {
    const soon = state.status === 'closing-soon'
    return (
      <span className={cn(base, soon ? 'text-warning' : 'text-success', className)}>
        <span
          className={cn('rounded-pill size-1.5', soon ? 'bg-warning' : 'bg-success')}
          aria-hidden
        />
        {soon ? labels.closingSoon : labels.open}
        <span className="text-ink-muted font-normal">
          · {interpolate(labels.closesAt, { time: formatTime(state.closesAt, locale) })}
        </span>
      </span>
    )
  }

  if (state.status === 'closed-today') {
    return (
      <span className={cn(base, 'text-ink-muted', className)}>
        <Clock className="size-3.5" aria-hidden />
        {labels.closed}
      </span>
    )
  }

  return (
    <span className={cn(base, 'text-ink-muted', className)}>
      <Clock className="size-3.5" aria-hidden />
      {labels.closed}
      <span className="font-normal">
        · {interpolate(labels.opensAt, { time: formatTime(state.opensAt, locale) })}
      </span>
    </span>
  )
}

/**
 * Full weekly schedule. Consecutive identical days collapse into one row the
 * way a printed sign would, and today is marked so the eye lands on it first.
 */
export function HoursTable({
  slots,
  overrides = [],
  locale,
  todayLabel,
  closedLabel,
  today,
  className,
}: {
  slots: HourSlot[]
  overrides?: HoursOverride[]
  locale: Locale
  todayLabel: string
  closedLabel: string
  /** 0–6, resolved by the caller in the market timezone. */
  today: number
  className?: string
}) {
  const groups = groupWeek(slots)
  const upcomingOverrides = overrides.slice(0, 3)

  return (
    <div className={cn('flex flex-col', className)}>
      <dl className="divide-line divide-y">
        {groups.map((group) => {
          const isToday = group.days.includes(today as never)
          const first = group.days[0]
          const last = group.days.at(-1)
          const dayLabel =
            group.days.length === 1 || first === undefined || last === undefined
              ? weekdayName(first ?? 0, locale, 'long')
              : `${weekdayName(first, locale)} – ${weekdayName(last, locale)}`

          return (
            <div
              key={group.days.join('-')}
              className={cn(
                'flex items-baseline justify-between gap-4 py-2.5 text-sm',
                isToday && 'font-medium',
              )}
            >
              <dt className={cn(isToday ? 'text-ink' : 'text-ink-muted')}>
                {dayLabel}
                {isToday && (
                  <span className="rounded-pill bg-accent-soft text-accent ms-2 px-2 py-0.5 text-xs">
                    {todayLabel}
                  </span>
                )}
              </dt>
              <dd className={cn('num text-end', isToday ? 'text-ink' : 'text-ink-muted')}>
                {group.slots.length === 0 ? (
                  closedLabel
                ) : (
                  <span className="flex flex-col">
                    {group.slots.map((slot) => (
                      <span key={`${slot.opens}-${slot.closes}`}>
                        {formatTime(slot.opens, locale)} – {formatTime(slot.closes, locale)}
                      </span>
                    ))}
                  </span>
                )}
              </dd>
            </div>
          )
        })}
      </dl>

      {upcomingOverrides.length > 0 && (
        <ul className="border-line mt-3 flex flex-col gap-1 border-t pt-3">
          {upcomingOverrides.map((override) => (
            <li key={override.date} className="text-warning flex items-center gap-2 text-xs">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {override.note ?? override.date}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
