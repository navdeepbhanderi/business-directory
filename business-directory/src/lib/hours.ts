import { getMarket, type MarketCode } from '@/i18n/config'

/**
 * Client-side mirror of the database's `is_open_at()`.
 *
 * The database remains the source of truth — search filtering happens there,
 * timezone-correct. This exists so a rendered card can show a live open/closed
 * state and the next transition without a round trip.
 *
 * The two implementations must agree. `hours.test.ts` covers the same three
 * cases the SQL suite does: split shifts, past-midnight closing, and date
 * overrides.
 */

/** 0 = Sunday, matching both `Date#getDay()` and the `day_of_week` column. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type HourSlot = {
  dayOfWeek: Weekday
  /** "HH:MM" in the market's local time. */
  opens: string
  closes: string
}

export type HoursOverride = {
  /** "YYYY-MM-DD" in the market's local time. */
  date: string
  closed: boolean
  opens?: string | null
  closes?: string | null
  note?: string | null
}

export type OpenState =
  | { status: 'open'; closesAt: string }
  | { status: 'closing-soon'; closesAt: string; minutesLeft: number }
  | { status: 'closed'; opensAt: string; opensDay: Weekday }
  | { status: 'closed-today' }
  | { status: 'unknown' }

const MINUTES_IN_DAY = 24 * 60

/** "HH:MM" → minutes past local midnight. Returns null on malformed input. */
export function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Reads the wall-clock date and time in a specific IANA timezone.
 *
 * Uses `Intl` parts rather than arithmetic on UTC offsets, so it stays correct
 * across DST transitions in markets that observe them. India does not, but the
 * architecture is multi-market and this is the cheap way to be right anyway.
 */
export function zonedParts(
  at: Date,
  timeZone: string,
): { date: string; minutes: number; weekday: Weekday } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  })

  const parts = new Map(formatter.formatToParts(at).map((p) => [p.type, p.value]))
  const year = parts.get('year') ?? '1970'
  const month = parts.get('month') ?? '01'
  const day = parts.get('day') ?? '01'
  // 'en-CA' with hour12:false yields 24 for midnight; normalise it to 0.
  const hour = Number(parts.get('hour') ?? '0') % 24
  const minute = Number(parts.get('minute') ?? '0')

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekdayIndex = weekdayNames.indexOf(parts.get('weekday') ?? 'Sun')

  return {
    date: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
    weekday: (weekdayIndex < 0 ? 0 : weekdayIndex) as Weekday,
  }
}

function shiftDate(isoDate: string, days: number): string {
  const [y = '1970', m = '01', d = '01'] = isoDate.split('-')
  const base = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

function previousWeekday(day: Weekday): Weekday {
  return ((day + 6) % 7) as Weekday
}

/** A slot whose closing time is at or before its opening time runs past midnight. */
function crossesMidnight(slot: { opens: number; closes: number }): boolean {
  return slot.closes <= slot.opens
}

type ResolvedSlot = { opens: number; closes: number }

function resolveSlots(
  slots: HourSlot[],
  overrides: HoursOverride[],
  isoDate: string,
  weekday: Weekday,
): { slots: ResolvedSlot[]; overridden: boolean; closedByOverride: boolean } {
  const override = overrides.find((o) => o.date === isoDate)

  if (override) {
    if (override.closed) return { slots: [], overridden: true, closedByOverride: true }
    const opens = override.opens ? toMinutes(override.opens) : null
    const closes = override.closes ? toMinutes(override.closes) : null
    if (opens === null || closes === null) {
      return { slots: [], overridden: true, closedByOverride: true }
    }
    return { slots: [{ opens, closes }], overridden: true, closedByOverride: false }
  }

  const resolved = slots
    .filter((s) => s.dayOfWeek === weekday)
    .map((s) => ({ opens: toMinutes(s.opens), closes: toMinutes(s.closes) }))
    .filter((s): s is ResolvedSlot => s.opens !== null && s.closes !== null)
    .sort((a, b) => a.opens - b.opens)

  return { slots: resolved, overridden: false, closedByOverride: false }
}

function minutesToTime(minutes: number): string {
  const normalised = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  const h = Math.floor(normalised / 60)
  const m = normalised % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const CLOSING_SOON_MINUTES = 60

/**
 * Resolves the live open state, including what happens next.
 *
 * "Closes at 22:30" is the answer people actually want — "Open" alone is only
 * half of it when it is 22:20.
 */
export function getOpenState({
  slots,
  overrides = [],
  at = new Date(),
  market = 'IN',
}: {
  slots: HourSlot[]
  overrides?: HoursOverride[]
  at?: Date
  market?: MarketCode
}): OpenState {
  if (slots.length === 0 && overrides.length === 0) return { status: 'unknown' }

  const { timeZone } = getMarket(market)
  const now = zonedParts(at, timeZone)

  // A slot that began yesterday and runs past midnight.
  const yesterdayDate = shiftDate(now.date, -1)
  const yesterday = resolveSlots(slots, overrides, yesterdayDate, previousWeekday(now.weekday))
  if (!yesterday.closedByOverride) {
    for (const slot of yesterday.slots) {
      if (crossesMidnight(slot) && now.minutes < slot.closes) {
        const minutesLeft = slot.closes - now.minutes
        return minutesLeft <= CLOSING_SOON_MINUTES
          ? { status: 'closing-soon', closesAt: minutesToTime(slot.closes), minutesLeft }
          : { status: 'open', closesAt: minutesToTime(slot.closes) }
      }
    }
  }

  const today = resolveSlots(slots, overrides, now.date, now.weekday)

  for (const slot of today.slots) {
    const endsAt = crossesMidnight(slot) ? slot.closes + MINUTES_IN_DAY : slot.closes
    if (now.minutes >= slot.opens && now.minutes < endsAt) {
      const minutesLeft = endsAt - now.minutes
      return minutesLeft <= CLOSING_SOON_MINUTES
        ? { status: 'closing-soon', closesAt: minutesToTime(slot.closes), minutesLeft }
        : { status: 'open', closesAt: minutesToTime(slot.closes) }
    }
  }

  // Still to come today.
  const upcoming = today.slots.find((slot) => slot.opens > now.minutes)
  if (upcoming) {
    return { status: 'closed', opensAt: minutesToTime(upcoming.opens), opensDay: now.weekday }
  }

  // Otherwise scan forward for the next day with any hours at all.
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = ((now.weekday + ahead) % 7) as Weekday
    const date = shiftDate(now.date, ahead)
    const next = resolveSlots(slots, overrides, date, day)
    const first = next.slots[0]
    if (first) {
      return { status: 'closed', opensAt: minutesToTime(first.opens), opensDay: day }
    }
  }

  return today.closedByOverride ? { status: 'closed-today' } : { status: 'unknown' }
}

/** Convenience wrapper matching the database function's boolean answer. */
export function isOpenAt(args: Parameters<typeof getOpenState>[0]): boolean {
  const state = getOpenState(args)
  return state.status === 'open' || state.status === 'closing-soon'
}

/**
 * Groups a week of slots for display, collapsing consecutive identical days
 * ("Mon – Fri  9:00 am – 9:00 pm") the way a printed sign would.
 */
export function groupWeek(slots: HourSlot[]): {
  days: Weekday[]
  slots: { opens: string; closes: string }[]
}[] {
  const byDay = new Map<Weekday, { opens: string; closes: string }[]>()
  for (let day = 0 as Weekday; day <= 6; day = (day + 1) as Weekday) {
    byDay.set(
      day,
      slots
        .filter((s) => s.dayOfWeek === day)
        .map((s) => ({ opens: s.opens, closes: s.closes }))
        .sort((a, b) => (toMinutes(a.opens) ?? 0) - (toMinutes(b.opens) ?? 0)),
    )
  }

  const signature = (day: Weekday) =>
    (byDay.get(day) ?? []).map((s) => `${s.opens}-${s.closes}`).join('|')

  const groups: { days: Weekday[]; slots: { opens: string; closes: string }[] }[] = []
  // Start the week on Monday, which is how opening hours are conventionally read.
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

  for (const day of order) {
    const last = groups.at(-1)
    const lastDay = last?.days.at(-1)
    if (last && lastDay !== undefined && signature(lastDay) === signature(day)) {
      last.days.push(day)
    } else {
      groups.push({ days: [day], slots: byDay.get(day) ?? [] })
    }
  }

  return groups
}
