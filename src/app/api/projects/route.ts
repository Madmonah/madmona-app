// src/app/api/projects/route.ts
// =====================================================================
// 🏗️ إضافة مشاريع المطورين — dynamic من ٣ مصادر:
//   1) الأدمن  → كوكي madmona_admin_session  → status=published فوراً
//   2) المارد  → هيدر x-projects-secret       → status=published فوراً
//   3) مطور self-serve من /add-project        → status=draft (مراجعتك قبل النشر)
// أي area_label جديدة بتظهر في البورصة أوتوماتيك — مفيش مناطق مقفولة.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { sbProjects as supabase } from '@/lib/supabaseProjects'
import { isAdminRequest } from '@/lib/adminGate'
import { PRICE_UNITS, SEGMENTS, slugify, type MediaItem } from '@/lib/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Caller = 'admin' | 'marid' | 'public'

async function whoIs(req: NextRequest): Promise<Caller> {
  if (await isAdminRequest(req)) return 'admin'
  const secret = req.headers.get('x-projects-secret') || ''
  const expected = process.env.PROJECTS_API_SECRET || ''
  if (expected && secret === expected) return 'marid'
  return 'public'
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

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'project'
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`
    const { data } = await supabase
      .from('property_market_items')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}

/** GET /api/projects?status=&q= — للأدمن بس */
export async function GET(req: NextRequest) {
  if ((await whoIs(req)) === 'public') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const q = url.searchParams.get('q')

  let query = supabase
    .from('property_market_items')
    .select('*')
    .eq('segment', 'developer')
    .order('sort_order', { ascending: true })
    .limit(500)

  if (status) query = query.eq('status', status)
  if (q) query = query.or(`title.ilike.%${q}%,developer.ilike.%${q}%,area_label.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data ?? [] })
}

/** POST /api/projects — إضافة مشروع */
export async function POST(req: NextRequest) {
  const caller = await whoIs(req)

  let b: Record<string, unknown>
  try {
    b = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const title = str(b.title, 160)
  const areaLabel = str(b.area_label, 120)
  if (!title || !areaLabel) {
    return NextResponse.json(
      { error: 'اسم المشروع والمنطقة مطلوبين' },
      { status: 400 },
    )
  }

  const segment = SEGMENTS.includes(b.segment as never) ? (b.segment as string) : 'developer'
  const priceUnit = PRICE_UNITS.includes(b.price_unit as never)
    ? (b.price_unit as string)
    : 'egp_total'

  // المطور اللي بيسجل بنفسه → draft لحد ما تراجعه
  const status = caller === 'public' ? 'draft' : (str(b.status) === 'draft' ? 'draft' : 'published')

  const media = Array.isArray(b.media) ? (b.media as MediaItem[]).slice(0, 12) : []
  const slug = await uniqueSlug(`${str(b.developer) || ''}-${title}`)

  const row = {
    slug,
    // area بقى مجرد bucket اختياري — العرض بيعتمد على area_label
    area: str(b.area, 40) || 'other',
    area_label: areaLabel,
    city: str(b.city, 80),
    segment,
    developer: str(b.developer, 120),
    title,
    unit_label: str(b.unit_label, 300),
    price_from: num(b.price_from),
    price_to: num(b.price_to),
    price_unit: priceUnit,
    note: str(b.note, 600),
    payment_plan: str(b.payment_plan, 600),
    delivery_label: str(b.delivery_label, 120),
    commission_pct: num(b.commission_pct),
    contact_phone: str(b.contact_phone, 24) || '+201002229982',
    source_lead_phone: str(b.source_lead_phone, 24),
    source_name: str(b.source_name, 120),
    cover_url: str(b.cover_url, 600),
    brochure_url: str(b.brochure_url, 600),
    video_url: str(b.video_url, 600),
    media,
    embargoed: b.embargoed === true,
    embargo_note: str(b.embargo_note, 400),
    status,
    is_active: status === 'published',
    sort_order: num(b.sort_order) ?? 500,
  }

  const { data, error } = await supabase
    .from('property_market_items')
    .insert(row)
    .select('id, slug, title, area_label, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'published') {
    try { revalidatePath('/real-estate/market') } catch { /* noop */ }
  }

  return NextResponse.json({ ok: true, project: data, submitted_by: caller }, { status: 201 })
}
