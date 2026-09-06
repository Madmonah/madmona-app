// src/app/api/admin/campaign-leads/route.ts
// ============================================================================
// 📣 ليدات الحملات للداشبورد (٦ سبتمبر ٢٠٢٦) — تحت /api/admin/* (كوكي اللوحة).
//    GET → عدّاد لكل حملة (الكل · النهارده · جديد) + آخر ٢٠ ليد.
//    POST {id, status, notes} → تحديث حالة الليد (new · contacted · converted · lost).
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: rows } = await admin
    .from('campaign_leads')
    .select('id, campaign, name, phone, business_type, city, message, utm_source, utm_medium, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  const list = (rows as Array<{ campaign: string; status: string; created_at: string }> | null) ?? []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const counts: Record<string, { total: number; today: number; new: number; converted: number }> = {}
  for (const r of list) {
    const c = (counts[r.campaign] ||= { total: 0, today: 0, new: 0, converted: 0 })
    c.total++
    if (new Date(r.created_at) >= today) c.today++
    if (r.status === 'new') c.new++
    if (r.status === 'converted') c.converted++
  }
  return NextResponse.json({ ok: true, counts, recent: list.slice(0, 20) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  const status = String(body.status || '')
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['new', 'contacted', 'converted', 'lost'].includes(status)) {
    return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  }
  const { error } = await admin.from('campaign_leads')
    .update({ status, notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined, updated_at: new Date().toISOString() })
    .eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}
