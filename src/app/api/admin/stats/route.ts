import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/stats
// Returns marketplace-wide metrics in the shape the admin dashboard expects.
// Wraps everything in `{ stats: {...} }` so the client can pattern-match
// future additions without breaking existing callers.
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Compute the start of "this week" (last 7 days) and "today" in ISO format
  const now = new Date()
  const todayIso = now.toISOString().split('T')[0]
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // Fire all queries in parallel for speed
  const [
    suppliersAll,
    suppliersByStatus,
    unitsAll,
    bookingsAll,
    payoutsUnpaid,
  ] = await Promise.all([
    supabase.from('suppliers').select('status'),
    supabase.from('suppliers').select('status'),
    supabase.from('space_units').select('id, is_active, category_slug'),
    supabase.from('unit_bookings').select('total_price_egp, commission_amount, supplier_payout, booking_date, status, payout_status, created_at'),
    supabase.from('unit_bookings').select('supplier_payout').eq('payout_status', 'unpaid').neq('status', 'cancelled'),
  ])

  // ---- Suppliers ----
  type SupplierRow = { status: string }
  const suppliers = (suppliersByStatus.data ?? []) as SupplierRow[]
  const supplierStats = {
    total: suppliers.length,
    approved: suppliers.filter((s) => s.status === 'approved').length,
    pending: suppliers.filter((s) => s.status === 'pending').length,
  }

  // ---- Units ----
  type UnitRow = { id: string; is_active: boolean; category_slug: string }
  const units = (unitsAll.data ?? []) as UnitRow[]
  const unitsByCategory: Record<string, number> = {}
  for (const u of units) {
    if (u.is_active) {
      unitsByCategory[u.category_slug] = (unitsByCategory[u.category_slug] || 0) + 1
    }
  }
  const unitStats = {
    total: units.length,
    active: units.filter((u) => u.is_active).length,
    by_category: unitsByCategory,
  }

  // ---- Bookings + Revenue ----
  type BookingRow = {
    total_price_egp: string | number
    commission_amount: string | number
    supplier_payout: string | number
    booking_date: string
    status: string
    payout_status: string
    created_at: string
  }
  const allBookings = (bookingsAll.data ?? []) as BookingRow[]
  const validBookings = allBookings.filter((b) => b.status !== 'cancelled')

  // Aggregate by time window
  const todayBookings = validBookings.filter((b) => b.booking_date === todayIso)
  const weekBookings = validBookings.filter((b) => b.booking_date >= weekAgo)

  const sumPrice = (rows: BookingRow[]) =>
    Math.round(rows.reduce((s, b) => s + Number(b.total_price_egp), 0) * 100) / 100

  const totalCommission = Math.round(
    validBookings.reduce((s, b) => s + Number(b.commission_amount), 0) * 100
  ) / 100

  const bookingStats = {
    total: validBookings.length,
    today: todayBookings.length,
    this_week: weekBookings.length,
    pending: validBookings.filter((b) => b.status === 'pending').length,
    confirmed: validBookings.filter((b) => b.status === 'confirmed').length,
  }

  // ---- Pending payouts ----
  type PayoutRow = { supplier_payout: string | number }
  const pendingPayout = Math.round(
    ((payoutsUnpaid.data ?? []) as PayoutRow[]).reduce(
      (s, b) => s + Number(b.supplier_payout),
      0
    ) * 100
  ) / 100

  const revenueStats = {
    total: sumPrice(validBookings),
    today: sumPrice(todayBookings),
    this_week: sumPrice(weekBookings),
    commission_earned: totalCommission,
    pending_payout: pendingPayout,
  }

  return NextResponse.json({
    stats: {
      suppliers: supplierStats,
      units: unitStats,
      bookings: bookingStats,
      revenue: revenueStats,
    },
  })
}
