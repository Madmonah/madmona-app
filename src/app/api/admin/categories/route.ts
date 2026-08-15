import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

// Auth gate: isAdminRequest (see src/lib/adminGate.ts, 15 Aug 2026).
// Was comparing to process.env.ADMIN_PASSWORD, removed in the 12 Aug
// security migration -> `if (!expected) return false` = always 401.

// GET /api/admin/categories — returns full category tree
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name_ar', { ascending: true })

  if (error) {
    console.error('[admin/categories] fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
  return NextResponse.json({ categories: data ?? [] })
}

// POST /api/admin/categories — create a new category
// Body: { parent_id?, name_ar, name_en?, slug, icon?, display_order? }
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { parent_id, name_ar, name_en, slug, icon, display_order, description } = body
  if (!name_ar || typeof name_ar !== 'string') {
    return NextResponse.json({ error: 'name_ar required' }, { status: 400 })
  }
  if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'slug required (lowercase, alphanumeric, hyphens only)' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    name_ar: name_ar.trim().slice(0, 200),
    slug: slug.trim(),
    display_order: typeof display_order === 'number' ? display_order : 0,
    is_active: true,
  }
  if (parent_id) insert.parent_id = parent_id
  if (name_en) insert.name_en = String(name_en).trim().slice(0, 200)
  if (icon) insert.icon = String(icon).trim().slice(0, 50)
  if (description) insert.description = String(description).trim().slice(0, 1000)

  // @ts-expect-error
  const { data, error } = await supabase.from('categories').insert(insert).select().single()
  if (error) {
    console.error('[admin/categories] insert error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'الـslug ده موجود قبل كده' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
  return NextResponse.json({ category: data })
}
