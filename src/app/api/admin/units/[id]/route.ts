import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/units/[id]
// Returns one unit with full detail for the edit form.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('space_units')
    .select(`
      *,
      supplier:suppliers ( id, business_name, district )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[admin/units/:id] fetch error:', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ unit: data })
}

// DELETE /api/admin/units/[id] — hard delete (use only if no bookings exist)
// Soft-delete is preferred via PATCH is_active=false on the parent route.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Refuse to delete if any bookings reference this unit.
  const { count } = await supabase
    .from('unit_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'الوحدة عليها حجوزات. استخدم زر الإيقاف بدلاً من الحذف.' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('space_units').delete().eq('id', id)
  if (error) {
    console.error('[admin/units/:id] delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
