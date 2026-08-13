import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// PATCH /api/admin/categories/[id] — update fields
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
  if (typeof body.slug === 'string' && /^[a-z0-9-]+$/.test(body.slug)) update.slug = body.slug.trim()
  if (typeof body.icon === 'string') update.icon = body.icon.trim().slice(0, 50)
  if (typeof body.description === 'string') update.description = body.description.trim().slice(0, 1000)
  if (typeof body.display_order === 'number') update.display_order = body.display_order
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (body.parent_id === null || typeof body.parent_id === 'string') update.parent_id = body.parent_id

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('categories').update(update).eq('id', params.id)
  if (error) {
    console.error('[admin/categories/PATCH] error:', error)
    if (error.code === '23505') return NextResponse.json({ error: 'الـslug موجود قبل كده' }, { status: 409 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/categories/[id] — only if no listings reference it
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check listings using this category
  const { count, error: countErr } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', params.id)

  if (countErr) {
    console.error('[admin/categories/DELETE] count error:', countErr)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `الفئة دي مرتبطة بـ${count} listing. مينفعش تتمسح.` },
      { status: 409 }
    )
  }

  // Check sub-categories
  const { count: subCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', params.id)

  if ((subCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `الفئة دي تحتها ${subCount} فئة فرعية. امسحهم الأول.` },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('categories').delete().eq('id', params.id)
  if (error) {
    console.error('[admin/categories/DELETE] error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
