// app/api/admin/social-packs/[id]/groups/[gid]/route.ts
// Update the per-group post status: mark as copied / posted / skipped.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; gid: string }> }
) {
  try {
    const { id: _pack_id, gid } = await ctx.params  // gid = social_pack_group_posts.id
    const body = await req.json()
    const action: 'copied' | 'posted' | 'skipped' | 'reset' = body.action

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {}

    switch (action) {
      case 'copied':
        updates.status = 'copied'
        updates.copied_at = now
        break
      case 'posted':
        updates.status = 'posted'
        updates.posted_at = now
        if (body.posted_by) updates.posted_by = body.posted_by
        if (body.external_post_url) updates.external_post_url = body.external_post_url
        break
      case 'skipped':
        updates.status = 'skipped'
        if (body.notes) updates.notes = body.notes
        break
      case 'reset':
        updates.status = 'queued'
        updates.copied_at = null
        updates.posted_at = null
        updates.posted_by = null
        updates.external_post_url = null
        break
      default:
        return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('social_pack_group_posts')
      .update(updates)
      .eq('id', gid)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, group_post: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
