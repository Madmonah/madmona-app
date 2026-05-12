// app/api/admin/social-groups/[id]/route.ts
// Update or delete a single group catalog entry.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const updates: Record<string, unknown> = {}
    for (const k of ['category_slug', 'group_name', 'group_url', 'platform', 'members_count', 'posting_rules', 'notes', 'is_active']) {
      if (k in body) updates[k] = body[k]
    }
    // @ts-expect-error
    const { data, error } = await supabase
      .from('social_groups_catalog')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, group: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    // @ts-expect-error
    const { error } = await supabase.from('social_groups_catalog').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
