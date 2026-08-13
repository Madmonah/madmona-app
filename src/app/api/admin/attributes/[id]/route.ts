import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// PATCH /api/admin/attributes/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.name_ar === 'string') update.name_ar = body.name_ar.trim().slice(0, 200)
  if (typeof body.name_en === 'string') update.name_en = body.name_en.trim().slice(0, 200)
  if (typeof body.unit === 'string') update.unit = body.unit.trim().slice(0, 30)
  if (typeof body.placeholder === 'string') update.placeholder = body.placeholder.slice(0, 200)
  if (typeof body.help_text === 'string') update.help_text = body.help_text.slice(0, 500)
  if (typeof body.is_required === 'boolean') update.is_required = body.is_required
  if (typeof body.is_filterable === 'boolean') update.is_filterable = body.is_filterable
  if (typeof body.display_order === 'number') update.display_order = body.display_order
  if (Array.isArray(body.options)) update.options = body.options

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('attributes').update(update).eq('id', params.id)
  if (error) {
    console.error('[admin/attributes/PATCH] error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/attributes/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('attributes').delete().eq('id', params.id)
  if (error) {
    console.error('[admin/attributes/DELETE] error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
