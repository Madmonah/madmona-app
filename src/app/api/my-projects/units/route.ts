// =====================================================================
// 🗂️ /api/my-projects/units — وحدات مشروع المطوّر (16 Jul 2026)
// نفس مصادقة /api/my-projects (توكن madmona_sessions) ونفس فحص الملكية
// (source_lead_phone). GET: وحدات مشروع · POST: إضافة/تعديل · DELETE: حذف.
// العميل بيشوف الوحدات من صفحة المشروع العامة ويحجز 48 ساعة عبر
// hold_unit_48h — هنا إدارة المطوّر بس.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const tail10 = (p: string) => (p || '').replace(/\D/g, '').slice(-10)

function getToken(req: NextRequest): string {
  const h = req.headers.get('authorization') || ''
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim()
  return req.headers.get('x-madmona-token') || req.cookies.get('madmona_token')?.value || ''
}

async function phoneFromToken(token: string): Promise<string | null> {
  if (!token) return null
  const { data } = await sb()
    .from('madmona_sessions')
    .select('account_id, expires_at')
    .eq('token', token)
    .maybeSingle()
  if (!data) return null
  const exp = (data as { expires_at?: string | null }).expires_at
  if (exp && new Date(exp) < new Date()) return null
  const accId = (data as { account_id?: string }).account_id
  if (!accId) return null
  const { data: acc } = await sb()
    .from('madmona_accounts')
    .select('phone_normalized')
    .eq('id', accId)
    .maybeSingle()
  return (acc as { phone_normalized?: string } | null)?.phone_normalized || null
}

/** المشروع ده بتاع الرقم ده؟ */
async function ownsProject(phone: string, projectId: string): Promise<boolean> {
  const { data } = await sb()
    .from('property_market_items')
    .select('id, source_lead_phone')
    .eq('id', projectId)
    .maybeSingle()
  if (!data) return false
  return tail10((data as { source_lead_phone?: string }).source_lead_phone || '') === tail10(phone)
}

// ── GET ?project_id= : وحدات المشروع (كلها، حتى المخفية — دي لوحة المطوّر)
export async function GET(req: NextRequest) {
  const phone = await phoneFromToken(getToken(req))
  if (!phone) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const projectId = req.nextUrl.searchParams.get('project_id') || ''
  if (!projectId) return NextResponse.json({ error: 'missing project_id' }, { status: 400 })
  if (!(await ownsProject(phone, projectId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { data, error } = await sb()
    .from('project_units')
    .select('*')
    .eq('project_id', projectId)
    .order('unit_code')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ units: data || [] })
}

// ── POST: إضافة أو تعديل وحدة (upsert على project_id+unit_code)
const UNIT_FIELDS = ['unit_code', 'unit_type', 'area_m2', 'floor_label', 'bedrooms', 'price', 'status', 'master_plan_ref', 'notes'] as const

export async function POST(req: NextRequest) {
  const phone = await phoneFromToken(getToken(req))
  if (!phone) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const projectId = String(body.project_id || '')
  if (!projectId) return NextResponse.json({ error: 'missing project_id' }, { status: 400 })
  if (!(await ownsProject(phone, projectId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const row: Record<string, unknown> = { project_id: projectId, updated_at: new Date().toISOString() }
  for (const k of UNIT_FIELDS) if (k in body) row[k] = body[k]
  if (!row.unit_code) return NextResponse.json({ error: 'missing unit_code' }, { status: 400 })
  // المطوّر رجّع الوحدة متاحة؟ نضّف بيانات الحجز القديم
  if (row.status === 'available') { row.held_until = null; row.held_by_phone = null; row.held_by_name = null }
  const { data, error } = await sb()
    .from('project_units')
    .upsert(row as never, { onConflict: 'project_id,unit_code' })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}

// ── DELETE: حذف وحدة
export async function DELETE(req: NextRequest) {
  const phone = await phoneFromToken(getToken(req))
  if (!phone) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const unitId = String(body.unit_id || '')
  if (!unitId) return NextResponse.json({ error: 'missing unit_id' }, { status: 400 })
  const { data: unit } = await sb()
    .from('project_units')
    .select('id, project_id')
    .eq('id', unitId)
    .maybeSingle()
  if (!unit) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!(await ownsProject(phone, (unit as { project_id: string }).project_id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { error } = await sb().from('project_units').delete().eq('id', unitId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
