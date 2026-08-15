import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

// Auth gate: isAdminRequest (see src/lib/adminGate.ts, 15 Aug 2026).
// Was comparing to process.env.ADMIN_PASSWORD, removed in the 12 Aug
// security migration -> `if (!expected) return false` = always 401.

const VALID_TYPES = ['text', 'number', 'boolean', 'select', 'multi_select', 'date', 'file']

// GET /api/admin/categories/[id]/attributes
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('attributes')
    .select('*')
    .eq('category_id', params.id)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[admin/categories/attributes/GET] error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ attributes: data ?? [] })
}

// POST /api/admin/categories/[id]/attributes — add a new attribute to this category
// Body: { name_ar, name_en?, field_key, field_type, options?, unit?, is_required?, display_order? }
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name_ar, name_en, field_key, field_type, options, unit, is_required, display_order, placeholder, help_text } = body

  if (!name_ar || typeof name_ar !== 'string') {
    return NextResponse.json({ error: 'name_ar required' }, { status: 400 })
  }
  if (!field_key || typeof field_key !== 'string' || !/^[a-z0-9_]+$/.test(field_key)) {
    return NextResponse.json({ error: 'field_key required (lowercase, alphanumeric, underscores only)' }, { status: 400 })
  }
  if (!field_type || !VALID_TYPES.includes(field_type)) {
    return NextResponse.json({ error: `field_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    category_id: params.id,
    name_ar: name_ar.trim().slice(0, 200),
    field_key: field_key.trim(),
    field_type,
    is_required: !!is_required,
    is_filterable: true,
    display_order: typeof display_order === 'number' ? display_order : 0,
    options: Array.isArray(options) ? options : [],
  }
  if (name_en) insert.name_en = String(name_en).trim().slice(0, 200)
  if (unit) insert.unit = String(unit).trim().slice(0, 30)
  if (placeholder) insert.placeholder = String(placeholder).slice(0, 200)
  if (help_text) insert.help_text = String(help_text).slice(0, 500)

  // @ts-expect-error
  const { data, error } = await supabase.from('attributes').insert(insert).select().single()
  if (error) {
    console.error('[admin/categories/attributes/POST] error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'field_key موجود قبل كده في الفئة دي' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
  return NextResponse.json({ attribute: data })
}
