import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/units/[id]/availability?date=YYYY-MM-DD
//
// Returns hour slots for the given unit on the given date.
// A slot is unavailable if covered by either:
//   1. A non-cancelled unit_booking, OR
//   2. A unit_block (admin/supplier set)
//
// This is the per-unit replacement for the old space-level
// /api/availability — the difference matters because two desks in
// the same coworking space can be booked independently.
export async function GET(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 })
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date (use YYYY-MM-DD)' }, { status: 400 })
  }

  // First, fetch the unit to know its operating hours
  // @ts-expect-error - new tables
  const { data: unit, error: unitError } = await supabase
    .from('space_units')
    .select('operating_start_hour, operating_end_hour, is_active')
    .eq('id', id)
    .single()

  if (unitError || !unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }
  const u = unit as { operating_start_hour: number; operating_end_hour: number; is_active: boolean }
  if (!u.is_active) {
    return NextResponse.json({ error: 'Unit not active' }, { status: 400 })
  }

  // Fire both queries in parallel
  // @ts-expect-error
  const bookingsPromise = supabase
    .from('unit_bookings')
    .select('start_hour, end_hour')
    .eq('unit_id', id)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  // @ts-expect-error
  const blocksPromise = supabase
    .from('unit_blocks')
    .select('start_hour, end_hour')
    .eq('unit_id', id)
    .eq('block_date', date)

  const [bookingsRes, blocksRes] = await Promise.all([bookingsPromise, blocksPromise])

  if (bookingsRes.error || blocksRes.error) {
    console.error(
      '[units/:id/availability] fetch error:',
      bookingsRes.error || blocksRes.error
    )
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }

  type Range = { start_hour: number; end_hour: number }
  const ranges: Range[] = [
    ...((bookingsRes.data ?? []) as Range[]),
    ...((blocksRes.data ?? []) as Range[]),
  ]

  const hours: Array<{ hour: number; available: boolean }> = []
  for (let h = u.operating_start_hour; h < u.operating_end_hour; h++) {
    const isBlocked = ranges.some((r) => h >= r.start_hour && h < r.end_hour)
    hours.push({ hour: h, available: !isBlocked })
  }

  return NextResponse.json({
    unit_id: id,
    date,
    operating_hours: { start: u.operating_start_hour, end: u.operating_end_hour },
    hours,
  })
}
