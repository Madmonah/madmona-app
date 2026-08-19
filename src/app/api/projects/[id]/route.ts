// src/app/api/projects/[id]/route.ts
// تعديل / حذف مشروع — الأدمن أو المارد بس.
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { sbProjects as supabase } from '@/lib/supabaseProjects'
import { isAdminRequest } from '@/lib/adminGate'
import { PRICE_UNITS } from '@/lib/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authed(req: NextRequest): Promise<boolean> {
  if (await isAdminRequest(req)) return true
  const expected = process.env.PROJECTS_API_SECRET || ''
  return !!expected && req.headers.get('x-projects-secret') === expected
}

// الأعمدة اللي مسموح تتعدّل — أي حاجة غيرها بتتجاهل
const EDITABLE = new Set([
  'area', 'area_label', 'city', 'developer', 'title', 'unit_label',
  'price_from', 'price_to', 'price_unit', 'note', 'payment_plan',
  'delivery_label', 'commission_pct', 'contact_phone', 'cover_url',
  'brochure_url', 'video_url', 'media', 'embargoed', 'embargo_note',
  'status', 'is_active', 'sort_order',
])

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await authed(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let b: Record<string, unknown>
  try {
    b = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(b)) {
    if (!EDITABLE.has(k)) continue
    if (k === 'price_unit' && !PRICE_UNITS.includes(v as never)) continue
    patch[k] = v === '' ? null : v
  }

  // النشر بيفعّل الصف تلقائياً، والأرشفة بتوقّفه
  if (patch.status === 'published') patch.is_active = true
  if (patch.status === 'draft' || patch.status === 'archived') patch.is_active = false

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'مفيش حاجة تتعدّل' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('property_market_items')
    .update(patch)
    .eq('id', params.id)
    .select('id, slug, title, status, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try { revalidatePath('/real-estate/market') } catch { /* noop */ }
  return NextResponse.json({ ok: true, project: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await authed(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error } = await supabase.from('property_market_items').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { revalidatePath('/real-estate/market') } catch { /* noop */ }
  return NextResponse.json({ ok: true })
}
