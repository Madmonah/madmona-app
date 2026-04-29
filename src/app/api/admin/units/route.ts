import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

  // @ts-expect-error - new tables
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

  // @ts-expect-error - new tables
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

  const allowedFields = [
    'name_ar', 'description_ar', 'photo_urls', 'capacity',
    'price_hourly', 'price_daily', 'price_package_10', 'price_monthly',
    'operating_start_hour', 'operating_end_hour', 'is_active',
  ]
  const cleanUpdates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in updates) cleanUpdates[key] = updates[key]
  }

  if (Object.keys(cleanUpdates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('space_units').update(cleanUpdates).eq('id', id)
  if (error) {
    console.error('[admin/units] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
