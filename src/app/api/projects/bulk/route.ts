// src/app/api/projects/bulk/route.ts
// =====================================================================
// 🏗️ سكريبت إضافة عقارات ريسيل/إيجار بالجملة — طلب محمد ١٩ أغسطس ٢٠٢٦:
// "عايز اسكريبت اضيف بيه اصحاب العقارات (ريسيل - ايجار)".
// أدمن بس (كوكي madmona_admin_session) — بياخد صفوف property_market_items
// جاهزة (اتفرّغت من Excel في /admin/projects/bulk) ويحفظهم دفعة واحدة،
// بنفس منطق التحقق والـslug اللي في /api/projects (POST) — بس بيلف على
// مصفوفة صفوف بدل صف واحد.
//
// ⚠️ الحالة الافتراضية: draft (مراجعة قبل النشر) — حتى للأدمن، لأن دي
// دفعة كبيرة مرة واحدة (عكس /api/projects اللي بينشر فورًا للأدمن لأنه
// إدخال يدوي فردي مراجَع وقت الكتابة). لو عايز تنشرهم فورًا بعد المراجعة
// في /admin/projects استخدم "انشر" هناك.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { sbProjects as supabase } from '@/lib/supabaseProjects'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'
import { PRICE_UNITS, SEGMENTS, slugify, type MediaItem } from '@/lib/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_SESSION_VALUE
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown, max = 2000): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

type BulkRow = {
  __row?: number
  title?: unknown
  segment?: unknown
  area_label?: unknown
  city?: unknown
  developer?: unknown
  unit_label?: unknown
  price_from?: unknown
  price_to?: unknown
  price_unit?: unknown
  note?: unknown
  payment_plan?: unknown
  contact_phone?: unknown
  cover_url?: unknown
}

type RowResult = { row: number; ok: boolean; title?: string; slug?: string; error?: string }

async function uniqueSlug(base: string, taken: Set<string>): Promise<string> {
  const root = slugify(base) || 'property'
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`
    if (taken.has(candidate)) continue
    const { data } = await supabase.from('property_market_items').select('id').eq('slug', candidate).maybeSingle()
    if (!data) { taken.add(candidate); return candidate }
  }
  const fallback = `${root}-${Math.random().toString(36).slice(2, 8)}`
  taken.add(fallback)
  return fallback
}

/** POST /api/projects/bulk — إضافة عقارات ريسيل/إيجار بالجملة (أدمن بس) */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { rows?: BulkRow[]; publish?: boolean }
  try {
    body = (await req.json()) as { rows?: BulkRow[]; publish?: boolean }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const rows = Array.isArray(body.rows) ? body.rows : []
  if (!rows.length) {
    return NextResponse.json({ error: 'مفيش صفوف للإضافة' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: 'أقصى حد 500 صف في المرة الواحدة' }, { status: 400 })
  }

  // لو الأدمن اختار "انشر فورًا" صراحة، غير كده draft للمراجعة —
  // دفعة كبيرة تستاهل مراجعة حتى من الأدمن نفسه قبل ما تظهر للعامة.
  const status = body.publish === true ? 'published' : 'draft'

  const results: RowResult[] = []
  const takenSlugs = new Set<string>()
  let inserted = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = typeof r.__row === 'number' ? r.__row : i + 1
    const title = str(r.title, 160)
    const areaLabel = str(r.area_label, 120)

    if (!title || !areaLabel) {
      results.push({ row: rowNum, ok: false, error: 'اسم العقار والمنطقة مطلوبين' })
      continue
    }

    const segment = SEGMENTS.includes(r.segment as never) ? (r.segment as string) : 'resale'
    const priceUnit = PRICE_UNITS.includes(r.price_unit as never) ? (r.price_unit as string) : 'egp_total'
    const slug = await uniqueSlug(`${str(r.developer) || ''}-${title}`, takenSlugs)

    const coverUrl = str(r.cover_url, 600)
    const media: MediaItem[] = coverUrl ? [{ url: coverUrl, type: 'image' }] : []

    const row = {
      slug,
      area: 'other',
      area_label: areaLabel,
      city: str(r.city, 80),
      segment,
      developer: str(r.developer, 120),
      title,
      unit_label: str(r.unit_label, 300),
      price_from: num(r.price_from),
      price_to: num(r.price_to),
      price_unit: priceUnit,
      note: str(r.note, 600),
      payment_plan: str(r.payment_plan, 600),
      contact_phone: str(r.contact_phone, 24) || '+201002229982',
      source_name: 'سكريبت إضافة بالجملة — أدمن',
      cover_url: coverUrl,
      media,
      status,
      is_active: status === 'published',
      sort_order: 500,
    }

    const { data, error } = await supabase
      .from('property_market_items')
      .insert(row)
      .select('id, slug, title')
      .single()

    if (error) {
      results.push({ row: rowNum, ok: false, title, error: error.message })
      continue
    }
    inserted++
    results.push({ row: rowNum, ok: true, title: data.title, slug: data.slug })
  }

  return NextResponse.json({
    ok: true,
    inserted,
    failed: results.length - inserted,
    status_used: status,
    results,
  })
}
