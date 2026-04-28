import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Spaces that support hourly booking. Expand as we onboard more.
const ALLOWED_SLUGS = new Set(['meeting-room'])

// Operating hours per space (24-hour clock).
// Hardcoded for v1 — will move to a `space_settings` table later if needed.
const OPERATING_HOURS: Record<string, { start: number; end: number }> = {
  'meeting-room': { start: 9, end: 23 },
}

// GET /api/availability?space=meeting-room&date=YYYY-MM-DD
//
// Returns an array of hour slots for the given date, each marked as
// available or not. Booked rows (any status except 'cancelled') block
// every hour from start_hour up to (but not including) end_hour.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const spaceSlug = searchParams.get('space')
  const date = searchParams.get('date')

  if (!spaceSlug || !ALLOWED_SLUGS.has(spaceSlug)) {
    return NextResponse.json({ error: 'Invalid space' }, { status: 400 })
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date (use YYYY-MM-DD)' }, { status: 400 })
  }

  const operating = OPERATING_HOURS[spaceSlug]

  // Pull all non-cancelled bookings on this date+space.
  // We use the service-role client (admin) here because RLS blocks anon SELECT.
  // @ts-expect-error - room_bookings not yet in generated Database type
  const { data: existing, error } = await supabase
    .from('room_bookings')
    .select('start_hour, end_hour')
    .eq('space_slug', spaceSlug)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  if (error) {
    console.error('[availability] fetch error:', error)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }

  type BookedRange = { start_hour: number; end_hour: number }
  const bookings = (existing ?? []) as BookedRange[]

  const hours: Array<{ hour: number; available: boolean }> = []
  for (let h = operating.start; h < operating.end; h++) {
    const isBooked = bookings.some((b) => h >= b.start_hour && h < b.end_hour)
    hours.push({ hour: h, available: !isBooked })
  }

  return NextResponse.json({
    space_slug: spaceSlug,
    date,
    operating_hours: operating,
    hours,
  })
}
