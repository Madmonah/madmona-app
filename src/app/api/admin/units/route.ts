import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type UnitUpdate = Database['public']['Tables']['space_units']['Update']

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/units → all units (active and inactive) with supplier info
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('space_units')
    .select(`
      *,
      supplier:suppliers ( id, business_name, district, status )
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[admin/units] fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  // Flatten supplier_name onto each row so the client doesn't need to dig into
  // the nested join object. Cheaper to do once on the server than in every
  // render of the admin units list.
  type UnitRow = {
    supplier?: { business_name?: string } | null
    [key: string]: unknown
  }
  const flattened = ((data ?? []) as UnitRow[]).map((row) => ({
    ...row,
    supplier_name: row.supplier?.business_name ?? null,
  }))

  return NextResponse.json({ units: flattened })
}

// POST /api/admin/units — admin can create units on behalf of any supplier
export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const {
    supplier_id, category_slug, name_ar, description_ar, photo_urls, capacity,
    price_hourly, price_daily, price_package_10, price_monthly,
    operating_start_hour, operating_end_hour,
  } = body as Record<string, unknown>

  if (typeof supplier_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(supplier_id)) {
    return NextResponse.json({ error: 'Invalid supplier_id' }, { status: 400 })
  }
  if (typeof category_slug !== 'string') {
    return NextResponse.json({ error: 'category_slug required' }, { status: 400 })
  }
  if (typeof name_ar !== 'string' || name_ar.trim().length < 2) {
    return NextResponse.json({ error: 'name_ar required' }, { status: 400 })
  }

  // ✅ (١٣ أغسطس ٢٠٢٦) جدول `space_units` كان **مش موجود في الداتابيز خالص**
  // فالمسار ده وكل ميزة «الوحدات» كانت بتفشل وقت التشغيل، والكاست اليدوي
  // اللي كان هنا كان بيخفي ده عن الأنواع. الجداول الأربعة اتعملت
  // (space_units · unit_bookings · unit_categories · space_blocks) بـRLS
  // وفهارس ومنع حجز مزدوج، فالكاست اتشال والأنواع بقت حقيقية.
  const { data, error } = await supabase
    .from('space_units')
    .insert({
      supplier_id,
      category_slug,
      name_ar: name_ar.trim(),
      description_ar: typeof description_ar === 'string' ? description_ar.trim() || null : null,
      photo_urls: Array.isArray(photo_urls) ? photo_urls.filter((u) => typeof u === 'string') : [],
      capacity: typeof capacity === 'number' && capacity > 0 ? capacity : 1,
      price_hourly: typeof price_hourly === 'number' ? price_hourly : null,
      price_daily: typeof price_daily === 'number' ? price_daily : null,
      price_package_10: typeof price_package_10 === 'number' ? price_package_10 : null,
      price_monthly: typeof price_monthly === 'number' ? price_monthly : null,
      operating_start_hour: typeof operating_start_hour === 'number' ? operating_start_hour : 9,
      operating_end_hour: typeof operating_end_hour === 'number' ? operating_end_hour : 23,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/units] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, unit_id: (data as { id: string } | null)?.id ?? null })
}

// PATCH /api/admin/units — update or deactivate
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, ...updates } = body as Record<string, unknown>
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })

  // ✅ بعد ما الجدول اتعمل بقت الأنواع حقيقية، فبناء التحديث بقى مكتوب صراحةً
  // بدل لوب على مصفوفة نصوص. الفايدة: لو عمود اتشال أو اتغيّر اسمه في
  // الداتابيز، ده هيقع **وقت البناء** بدل ما يفضل يبعت عمود وهمي بصمت.
  const u = updates as Record<string, unknown>
  const cleanUpdates: UnitUpdate = {}
  if ('category_slug' in u) cleanUpdates.category_slug = u.category_slug as string
  if ('name_ar' in u) cleanUpdates.name_ar = u.name_ar as string
  if ('description_ar' in u) cleanUpdates.description_ar = u.description_ar as string | null
  if ('photo_urls' in u) cleanUpdates.photo_urls = u.photo_urls as string[]
  if ('capacity' in u) cleanUpdates.capacity = u.capacity as number
  if ('price_hourly' in u) cleanUpdates.price_hourly = u.price_hourly as number | null
  if ('price_daily' in u) cleanUpdates.price_daily = u.price_daily as number | null
  if ('price_package_10' in u) cleanUpdates.price_package_10 = u.price_package_10 as number | null
  if ('price_monthly' in u) cleanUpdates.price_monthly = u.price_monthly as number | null
  if ('operating_start_hour' in u) cleanUpdates.operating_start_hour = u.operating_start_hour as number
  if ('operating_end_hour' in u) cleanUpdates.operating_end_hour = u.operating_end_hour as number
  if ('is_active' in u) cleanUpdates.is_active = u.is_active as boolean

  if (Object.keys(cleanUpdates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('space_units').update(cleanUpdates).eq('id', id)
  if (error) {
    console.error('[admin/units] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
