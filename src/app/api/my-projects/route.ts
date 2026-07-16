// =====================================================================
// 🏗️ /api/my-projects — مشاريع المطوّر
// المصادقة: توكن جلسة madmona_sessions (نفس نظام الدخول بالواتساب —
// من غير إيميل ولا باسورد). المطوّر بيشوف ويعدّل مشاريعه هو بس.
// الربط: property_market_items.source_lead_phone == رقم الحساب.
// (13 Jul 2026)
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

// آخر 10 أرقام — عشان 01xxx و +201xxx يتطابقوا
const tail10 = (p: string) => (p || '').replace(/\D/g, '').slice(-10)

// الفرونت بيخزّن التوكن في localStorage.madmona_token وبيبعته في الهيدر
function getToken(req: NextRequest): string {
  const h = req.headers.get('authorization') || ''
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim()
  return req.headers.get('x-madmona-token') || req.cookies.get('madmona_token')?.value || ''
}

/** توكن الجلسة -> رقم موبايل موثّق. null = مش مسجّل دخول. */
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

// ── GET: مشاريعي ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const phone = await phoneFromToken(getToken(req))
  if (!phone) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await sb()
    .from('property_market_items')
    .select(
      'id, slug, title, developer, area_label, city, unit_label, price_from, price_to, ' +
      'price_unit, payment_plan, delivery_label, note, cover_url, brochure_url, video_url, ' +
      'media, is_active, status, embargoed, source_lead_phone, updated_at, ' +
      'booking_enabled, booking_fee, booking_fee_note',
    )
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const t = tail10(phone)
  const mine = (data || []).filter(
    (r) => tail10((r as { source_lead_phone?: string }).source_lead_phone || '') === t,
  )
  return NextResponse.json({ phone, count: mine.length, projects: mine })
}

// ── PATCH: عدّل مشروعي ────────────────────────────────────────────────
const EDITABLE = [
  'title', 'developer', 'area_label', 'city', 'unit_label',
  'price_from', 'price_to', 'price_unit', 'payment_plan', 'delivery_label',
  'note', 'cover_url', 'brochure_url', 'video_url',
  // 🖼️ (14 Jul 2026) معرض الصور — array من روابط الصور
  'media',
  // 🗂️ (16 Jul 2026) حجز الوحدات 48 ساعة — المطوّر بيفعّلها ويحدد الرسوم
  'booking_enabled', 'booking_fee', 'booking_fee_note',
] as const

export async function PATCH(req: NextRequest) {
  const phone = await phoneFromToken(getToken(req))
  if (!phone) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  // 🔒 الأهم: المشروع ده بتاعه فعلاً؟
  const { data: row } = await sb()
    .from('property_market_items')
    .select('id, source_lead_phone')
    .eq('id', id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (tail10((row as { source_lead_phone?: string }).source_lead_phone || '') !== tail10(phone)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const patch: Record<string, unknown> = {}
  for (const k of EDITABLE) if (k in body) patch[k] = body[k]
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const { error } = await sb().from('property_market_items').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // نحدّث البورصة على طول عشان التعديل يبان
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.madmonacairo.com'
    await fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET || '',
      },
      body: JSON.stringify({ paths: ['/real-estate/market'] }),
    })
  } catch { /* التعديل اتحفظ — التحديث مش حرج */ }

  return NextResponse.json({ ok: true })
}
