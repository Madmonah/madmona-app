import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

// ============================================================
// /api/admin/marketplace-orders
// GET — list orders (optional ?status=pending_payment filter)
// PATCH — verify/reject payment + set status via set_order_status RPC
// Service role bypasses RLS. Auth via x-admin-password header.
// ============================================================

// Auth gate: isAdminRequest (see src/lib/adminGate.ts, 15 Aug 2026).
// Was comparing to process.env.ADMIN_PASSWORD, removed in the 12 Aug
// security migration -> `if (!expected) return false` = always 401.

// GET /api/admin/marketplace-orders?status=pending_payment
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  let query = supabase
    .from('marketplace_orders')
    .select(`
      id, reference_code, order_type, status,
      currency, subtotal_amount, delivery_fee, total_amount,
      commission_amount, supplier_payout,
      customer_id, guest_name, guest_phone,
      delivery_address, delivery_city, delivery_district, delivery_phone,
      delivery_notes, customer_notes,
      payment_method, payment_reference,
      cancellation_reason, created_at, paid_at, cancelled_at,
      supplier:marketplace_suppliers(id, business_name, profile:profiles!marketplace_suppliers_profile_id_fkey(phone)),
      customer:profiles!marketplace_orders_customer_id_fkey(full_name, phone),
      items:marketplace_order_items(id, name_snapshot, unit_price, quantity, line_total)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (statusFilter) {
    query = query.eq('status', statusFilter as never)
  }

  const { data, error } = await query
  if (error) {
    console.error('[admin/marketplace-orders] fetch error:', error)
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 })
  }
  return NextResponse.json({ orders: data ?? [] })
}

// PATCH /api/admin/marketplace-orders
// Body:
//   { id, action: 'verify_payment', payment_reference?: string }    -> sets status='paid'
//   { id, action: 'cancel', cancellation_reason: string }           -> sets status='cancelled'
//   { id, action: 'set_status', new_status: OrderStatus }           -> generic status set
export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, action, payment_reference, cancellation_reason, new_status } = body as Record<string, unknown>

  if (typeof id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  if (typeof action !== 'string') {
    return NextResponse.json({ error: 'action required' }, { status: 400 })
  }

  // Resolve target status from action
  let targetStatus: string | null = null
  let reasonForCancel: string | null = null

  if (action === 'verify_payment') {
    targetStatus = 'paid'
    // Persist payment_reference first if provided
    if (typeof payment_reference === 'string' && payment_reference.trim()) {
      const { error: refError } = await supabase
        .from('marketplace_orders')
        .update({ payment_reference: payment_reference.trim() })
        .eq('id', id)
      if (refError) {
        console.error('[admin/marketplace-orders] payment_reference update failed:', refError)
        return NextResponse.json({ error: 'Failed to set payment_reference', details: refError.message }, { status: 500 })
      }
    }
  } else if (action === 'cancel') {
    targetStatus = 'cancelled'
    if (typeof cancellation_reason !== 'string' || !cancellation_reason.trim()) {
      return NextResponse.json({ error: 'cancellation_reason required for cancel' }, { status: 400 })
    }
    reasonForCancel = cancellation_reason.trim()
  } else if (action === 'set_status') {
    const ALLOWED = [
      'pending_payment', 'paid', 'accepted', 'preparing', 'ready',
      'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded',
    ]
    if (typeof new_status !== 'string' || !ALLOWED.includes(new_status)) {
      return NextResponse.json({ error: 'Invalid new_status' }, { status: 400 })
    }
    targetStatus = new_status
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Call set_order_status RPC.
  // NOTE: the DB function param is `p_reason` (not `p_cancellation_reason`).
  // Pre-deploy bug discovered May 29 2026 — Supabase RPCs match by named arg.
  const { error: rpcError } = await supabase.rpc('set_order_status', {
    p_order_id: id,
    p_new_status: targetStatus as never,
    p_reason: reasonForCancel ?? undefined,
  })

  if (rpcError) {
    console.error('[admin/marketplace-orders] set_order_status error:', rpcError)
    return NextResponse.json({ error: 'Failed', details: rpcError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, new_status: targetStatus })
}
