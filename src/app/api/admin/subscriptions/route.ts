// src/app/api/admin/subscriptions/route.ts
// ============================================================================
// 💳 مراجعة إثباتات دفع برنامج الإدارة (١١ سبتمبر ٢٠٢٦) — شاشة /admin/subscriptions
// الميدل وير بيحرس /api/admin/* بكوكي اللوحة؛ وهنا تأكيد تاني بـisAdminRequest.
//
// GET  ?status=pending|all → القايمة + signed URL للإثبات (bucket خاص، ساعة)
// POST {id, action:'approve'|'reject', note?, supplier_id?}
//   approve → subscription_payments.status='approved' + suppliers.subscription_tier='business' (+has_erp_crm)
//   reject  → status='rejected' + السبب
// ملاحظة: التفعيل = tier على المورد. الحجب بالـtier جوّه erpModules لسه قرار محمد (٧/٩) — التفعيل بيسجّل الحقيقة دلوقتي.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const BUCKET = 'payment-proofs'

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const status = req.nextUrl.searchParams.get('status') || 'pending'
  let q = admin.from('subscription_payments').select('*').order('created_at', { ascending: false }).limit(200)
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const rows = await Promise.all((data || []).map(async (r: any) => {
    const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(r.proof_path, 3600)
    let supplier: { id: string; business_name: string } | null = null
    if (r.supplier_id) {
      const { data: sup } = await admin.from('suppliers').select('id, business_name').eq('id', r.supplier_id).maybeSingle()
      supplier = sup || null
    }
    return { ...r, proof_url: s?.signedUrl || null, supplier }
  }))
  return NextResponse.json({ ok: true, rows })
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  const action = String(body.action || '')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  const supplierId = typeof body.supplier_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.supplier_id) ? body.supplier_id : null
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['approve', 'reject'].includes(action)) return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })

  const { data: row } = await admin.from('subscription_payments').select('*').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ ok: false, error: 'الطلب مش موجود' }, { status: 404 })
  if (row.status !== 'pending') return NextResponse.json({ ok: false, error: 'الطلب اتراجع قبل كده' }, { status: 409 })

  const sid = supplierId || row.supplier_id || null
  const reviewer = req.headers.get('x-admin-name') || 'admin'
  const patch: Record<string, unknown> = { status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: reviewer, review_note: note || null, supplier_id: sid }
  const { error } = await admin.from('subscription_payments').update(patch).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  let activated = false
  if (action === 'approve' && sid) {
    const { error: e2 } = await admin.from('suppliers').update({ subscription_tier: 'business', has_erp_crm: true }).eq('id', sid)
    activated = !e2
    if (e2) console.error('[admin/subscriptions] activate', e2.message)
  }
  return NextResponse.json({ ok: true, status: patch.status, activated, needs_supplier: action === 'approve' && !sid })
}
