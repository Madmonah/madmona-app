import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Reuses the same X-Admin-Password header pattern as /api/admin/leads.
// Both admin endpoints share the single ADMIN_PASSWORD env var.
function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/bookings → list of room_bookings (newest first, max 200)
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // @ts-expect-error - room_bookings not yet in generated Database type
  const { data, error } = await supabase
    .from('room_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/bookings] fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  return NextResponse.json({ bookings: data ?? [] })
}

// PATCH /api/admin/bookings → update status / payment_status of a booking
//
// Body: { id, status?, payment_status? }
// Allowed status values: pending, confirmed, cancelled, completed, no_show
// Allowed payment_status values: pending, verified, rejected, refunded
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, status, payment_status } = body as Record<string, unknown>
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const update: Record<string, string> = {}
  const allowedStatus = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
  const allowedPayment = ['pending', 'verified', 'rejected', 'refunded']

  if (status !== undefined) {
    if (typeof status !== 'string' || !allowedStatus.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = status
  }
  if (payment_status !== undefined) {
    if (typeof payment_status !== 'string' || !allowedPayment.includes(payment_status)) {
      return NextResponse.json({ error: 'Invalid payment_status' }, { status: 400 })
    }
    update.payment_status = payment_status
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('room_bookings').update(update).eq('id', id)

  if (error) {
    console.error('[admin/bookings] update error:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
