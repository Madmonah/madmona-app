import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Spaces that support hourly booking AND need availability lookups.
// Indoor coworking and meeting room are hourly. Garden is daily-only,
// office is monthly-only — they don't need this endpoint.
const HOURLY_SPACES = new Set(['meeting-room', 'indoor-coworking'])

// Operating hours per space (24-hour clock).
const OPERATING_HOURS: Record<string, { start: number; end: number }> = {
  'meeting-room': { start: 9, end: 23 },
  'indoor-coworking': { start: 9, end: 23 },
}

// GET /api/availability?space=meeting-room&date=YYYY-MM-DD
//
// Returns an array of hour slots, each marked as available or not.
// A slot is unavailable if EITHER:
//   1. A non-cancelled booking covers it (room_bookings table), OR
//   2. An admin block covers it (space_blocks table)
// Both are queried in parallel for speed.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const spaceSlug = searchParams.get('space')
  const date = searchParams.get('date')

  if (!spaceSlug || !HOURLY_SPACES.has(spaceSlug)) {
    return NextResponse.json({ error: 'Invalid space' }, { status: 400 })
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date (use YYYY-MM-DD)' }, { status: 400 })
  }

  const operating = OPERATING_HOURS[spaceSlug]

  // Fire both queries in parallel — neither blocks the other.
  // @ts-expect-error - tables not yet in generated Database type
  const bookingsPromise = supabase
    .from('room_bookings')
    .select('start_hour, end_hour')
    .eq('space_slug', spaceSlug)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  // @ts-expect-error
  const blocksPromise = supabase
    .from('space_blocks')
    .select('start_hour, end_hour')
    .eq('space_slug', spaceSlug)
    .eq('block_date', date)

  const [bookingsRes, blocksRes] = await Promise.all([bookingsPromise, blocksPromise])

  if (bookingsRes.error) {
    console.error('[availability] bookings fetch error:', bookingsRes.error)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
  if (blocksRes.error) {
    console.error('[availability] blocks fetch error:', blocksRes.error)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }

  type Range = { start_hour: number; end_hour: number }
  const ranges: Range[] = [
    ...((bookingsRes.data ?? []) as Range[]),
    ...((blocksRes.data ?? []) as Range[]),
  ]

  const hours: Array<{ hour: number; available: boolean }> = []
  for (let h = operating.start; h < operating.end; h++) {
    const isBlocked = ranges.some((r) => h >= r.start_hour && h < r.end_hour)
    hours.push({ hour: h, available: !isBlocked })
  }

  return NextResponse.json({
    space_slug: spaceSlug,
    date,
    operating_hours: operating,
    hours,
  })
}
