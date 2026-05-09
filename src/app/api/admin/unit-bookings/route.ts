import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/unit-bookings → all bookings with unit + supplier joined
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const payoutStatus = searchParams.get('payout_status') // 'unpaid' | 'paid' | null

  // @ts-expect-error - new tables
  let query = supabase
    .from('unit_bookings')
    .select(`
      *,
      unit:space_units ( id, name_ar, category_slug, supplier:suppliers ( id, business_name ) )
    `)
    .order('created_at', { ascending: false })

  if (payoutStatus === 'unpaid' || payoutStatus === 'paid') {
    query = query.eq('payout_status', payoutStatus)
  }

  const { data, error } = await query.limit(500)
  if (error) {
    console.error('[admin/unit-bookings] fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ bookings: data ?? [] })
}

// PATCH /api/admin/unit-bookings
// Body: { id, status?, payment_status?, payout_status? }
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, status, payment_status, payout_status } = body as Record<string, unknown>
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowedStatus = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
  const allowedPayment = ['pending', 'verified', 'rejected', 'refunded']
  const allowedPayout = ['unpaid', 'paid']

  const update: Record<string, unknown> = {}
  if (typeof status === 'string' && allowedStatus.includes(status)) update.status = status
  if (typeof payment_status === 'string' && allowedPayment.includes(payment_status)) update.payment_status = payment_status
  if (typeof payout_status === 'string' && allowedPayout.includes(payout_status)) {
    update.payout_status = payout_status
    if (payout_status === 'paid') update.payout_paid_at = new Date().toISOString()
    if (payout_status === 'unpaid') update.payout_paid_at = null
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('unit_bookings').update(update).eq('id', id)
  if (error) {
    console.error('[admin/unit-bookings] update error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
