// api/integrations/orders — ربط أنظمة المطاعم الخارجية (POS/ERP) بأوردرات مضمونة
// ==============================================================================
// GET  ?since=<ISO>&status=<s>  → قائمة الأوردرات (JSON) — Header: x-api-key
// POST { order_id | reference_code, status } → تحديث حالة الأوردر من سيستم المطعم
//
// كل مورد ليه api_key في جدول supplier_integrations (service-role only).
// (17 Jul 2026) — طلب محمد: «نوجد وسيلة ربط بين السيستم بتاعنا وأي سيستم
// ممكن يكون المطعم شغال بيه من ناحية الأوردرات».

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUS = ['accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'] as const

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function resolveSupplier(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (!key) return null
  const { data } = await sb()
    .from('supplier_integrations')
    .select('supplier_id, is_active')
    .eq('api_key', key)
    .maybeSingle()
  if (!data || !data.is_active) return null
  return data.supplier_id as string
}

export async function GET(req: NextRequest) {
  const supplierId = await resolveSupplier(req)
  if (!supplierId) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  const url = new URL(req.url)
  const since = url.searchParams.get('since')
  const status = url.searchParams.get('status')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

  let q = sb()
    .from('marketplace_orders')
    .select(`id, reference_code, status, order_type, subtotal_amount, delivery_fee, total_amount,
             currency, payment_method, guest_name, guest_phone, delivery_address, delivery_city,
             delivery_district, customer_notes, created_at, updated_at,
             items:marketplace_order_items(name_snapshot, quantity, unit_price, line_total, item_notes)`)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (since) q = q.gte('updated_at', since)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data || [] })
}

export async function POST(req: NextRequest) {
  const supplierId = await resolveSupplier(req)
  if (!supplierId) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  let body: { order_id?: string; reference_code?: string; status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const status = (body.status || '').toLowerCase()
  if (!ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
    return NextResponse.json({ error: 'invalid_status', allowed: ALLOWED_STATUS }, { status: 400 })
  }
  if (!body.order_id && !body.reference_code) {
    return NextResponse.json({ error: 'order_id_or_reference_code_required' }, { status: 400 })
  }

  const stampCol: Record<string, string> = {
    accepted: 'accepted_at', preparing: 'preparing_at', ready: 'ready_at',
    out_for_delivery: 'out_for_delivery_at', delivered: 'delivered_at', cancelled: 'cancelled_at',
  }
  const patch: Record<string, unknown> = { status, [stampCol[status]]: new Date().toISOString() }
  if (status === 'cancelled') patch.cancelled_by = 'supplier_system'

  let q = sb().from('marketplace_orders').update(patch).eq('supplier_id', supplierId)
  q = body.order_id ? q.eq('id', body.order_id) : q.eq('reference_code', body.reference_code!)
  const { data, error } = await q.select('id, reference_code, status').maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'order_not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, order: data })
}
