import { describe, expect, it } from 'vitest'
import { getOpenState, groupWeek, isOpenAt, toMinutes, zonedParts, type HourSlot } from './hours'

/**
 * These mirror the pgTAP cases in `supabase/tests/02_functions.test.sql`.
 * The client display and the database filter must agree, or a card will say
 * "Open now" for a listing that search has already excluded.
 *
 * Instants are given in UTC so the expected IST wall-clock time is explicit.
 */

const everyDay = (opens: string, closes: string): HourSlot[] =>
  ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({ dayOfWeek, opens, closes }))

const splitShift: HourSlot[] = ([0, 1, 2, 3, 4, 5, 6] as const).flatMap((dayOfWeek) => [
  { dayOfWeek, opens: '11:00', closes: '15:00' },
  { dayOfWeek, opens: '18:30', closes: '22:30' },
])

const lateNight = everyDay('18:00', '01:30')
const plain = everyDay('09:00', '18:00')

describe('toMinutes', () => {
  it('converts a wall-clock time to minutes past midnight', () => {
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('09:30')).toBe(570)
    expect(toMinutes('23:59')).toBe(1439)
  })

  it('rejects malformed or out-of-range input rather than guessing', () => {
    expect(toMinutes('')).toBeNull()
    expect(toMinutes('9')).toBeNull()
    expect(toMinutes('25:00')).toBeNull()
    expect(toMinutes('12:99')).toBeNull()
  })
})

describe('zonedParts', () => {
  it('reads wall-clock time in the target zone, not the host zone', () => {
    // 18:30 UTC on 5 Aug 2026 is 00:00 on 6 Aug in Kolkata.
    const parts = zonedParts(new Date('2026-08-05T18:30:00Z'), 'Asia/Kolkata')
    expect(parts.date).toBe('2026-08-06')
    expect(parts.minutes).toBe(0)
    expect(parts.weekday).toBe(4) // Thursday
  })
})

describe('getOpenState — split shift', () => {
  it('is open during the lunch service', () => {
    const state = getOpenState({ slots: splitShift, at: new Date('2026-08-05T06:30:00Z') })
    expect(state.status).toBe('open')
    expect(state).toMatchObject({ closesAt: '15:00' })
  })

  it('is closed in the afternoon gap, and reports the evening reopening', () => {
    const state = getOpenState({ slots: splitShift, at: new Date('2026-08-05T10:30:00Z') })
    expect(state).toMatchObject({ status: 'closed', opensAt: '18:30' })
  })

  it('is open again for dinner', () => {
    const state = getOpenState({ slots: splitShift, at: new Date('2026-08-05T14:30:00Z') })
    expect(state.status).toBe('open')
    expect(state).toMatchObject({ closesAt: '22:30' })
  })
})

describe('getOpenState — past midnight', () => {
  it('is open before midnight', () => {
    // 23:30 IST
    expect(isOpenAt({ slots: lateNight, at: new Date('2026-08-05T18:00:00Z') })).toBe(true)
  })

  it('is still open after midnight on the previous day slot', () => {
    // 00:45 IST on 6 Aug
    const state = getOpenState({ slots: lateNight, at: new Date('2026-08-05T19:15:00Z') })
    expect(state).toMatchObject({ status: 'closing-soon', closesAt: '01:30' })
  })

  it('is closed once the slot ends', () => {
    // 02:30 IST on 6 Aug
    expect(isOpenAt({ slots: lateNight, at: new Date('2026-08-05T21:00:00Z') })).toBe(false)
  })
})

describe('getOpenState — timezone', () => {
  it('uses the market timezone rather than the host clock', () => {
    // 18:00 UTC is 23:30 IST, so a 09:00-18:00 shop is closed.
    expect(isOpenAt({ slots: plain, at: new Date('2026-08-05T18:00:00Z') })).toBe(false)
    // 06:30 UTC is 12:00 IST, so it is open.
    expect(isOpenAt({ slots: plain, at: new Date('2026-08-05T06:30:00Z') })).toBe(true)
  })
})

describe('getOpenState — date overrides', () => {
  const diwali = [{ date: '2026-11-08', closed: true, note: 'Closed for Diwali' }]
  const holi = [{ date: '2026-03-04', closed: false, opens: '11:00', closes: '16:00' }]

  it('honours a full-day closure over the weekly schedule', () => {
    // 12:00 IST on Diwali.
    const state = getOpenState({
      slots: plain,
      overrides: diwali,
      at: new Date('2026-11-08T06:30:00Z'),
    })
    expect(state.status).not.toBe('open')
  })

  it('honours shortened hours', () => {
    // 10:00 IST — before the override opening, though after the usual 09:00.
    expect(isOpenAt({ slots: plain, overrides: holi, at: new Date('2026-03-04T04:30:00Z') })).toBe(
      false,
    )
    // 12:00 IST — inside the shortened window.
    expect(isOpenAt({ slots: plain, overrides: holi, at: new Date('2026-03-04T06:30:00Z') })).toBe(
      true,
    )
  })

  it('does not carry a past-midnight slot through a day that was closed', () => {
    const overrides = [{ date: '2026-08-05', closed: true }]
    // 00:45 IST on 6 Aug would normally be covered by the 5 Aug evening slot.
    expect(isOpenAt({ slots: lateNight, overrides, at: new Date('2026-08-05T19:15:00Z') })).toBe(
      false,
    )
  })
})

describe('getOpenState — closing soon', () => {
  it('flags the final hour so the badge can warn', () => {
    // 17:20 IST, twenty minutes before an 18:00 close.
    const state = getOpenState({ slots: plain, at: new Date('2026-08-05T11:50:00Z') })
    expect(state).toMatchObject({ status: 'closing-soon', minutesLeft: 40 })
  })

  it('does not flag a listing with hours left', () => {
    expect(getOpenState({ slots: plain, at: new Date('2026-08-05T06:30:00Z') }).status).toBe('open')
  })
})

describe('getOpenState — missing data', () => {
  it('reports unknown rather than claiming closed', () => {
    expect(getOpenState({ slots: [] }).status).toBe('unknown')
  })
})

describe('groupWeek', () => {
  it('collapses identical consecutive days into one row', () => {
    const groups = groupWeek(plain)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.days).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('separates a day whose hours differ', () => {
    const slots: HourSlot[] = [
      ...([1, 2, 3, 4, 5] as const).map((d) => ({ dayOfWeek: d, opens: '09:00', closes: '18:00' })),
      { dayOfWeek: 6, opens: '10:00', closes: '14:00' },
    ]
    const groups = groupWeek(slots)
    expect(groups.map((g) => g.days)).toEqual([[1, 2, 3, 4, 5], [6], [0]])
    expect(groups.at(-1)?.slots).toEqual([]) // Sunday closed
  })

  it('keeps both halves of a split shift on one row', () => {
    const groups = groupWeek(splitShift)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.slots).toHaveLength(2)
  })

  it('starts the week on Monday', () => {
    expect(groupWeek(plain)[0]?.days[0]).toBe(1)
  })
})
