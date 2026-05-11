// app/api/admin/social-groups/route.ts
// CRUD for the FB groups catalog (used by social-pack-builder to suggest where to post).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // @ts-expect-error generated types not in sync
    const { data: groups, error } = await supabase
      .from('social_groups_catalog')
      .select('*')
      .order('category_slug', { ascending: true })
      .order('group_name', { ascending: true })
    if (error) throw error

    // Aggregate per-category stats: total groups, real (non-placeholder) groups
    const byCategory: Record<string, { total: number; real: number; placeholder: number }> = {}
    for (const g of (groups ?? []) as { category_slug: string; group_url: string; is_active: boolean }[]) {
      const cat = g.category_slug
      if (!byCategory[cat]) byCategory[cat] = { total: 0, real: 0, placeholder: 0 }
      byCategory[cat].total++
      if (g.group_url.includes('PLACEHOLDER')) byCategory[cat].placeholder++
      else byCategory[cat].real++
    }

    return NextResponse.json({ groups: groups ?? [], stats: byCategory })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.category_slug || !body.group_name || !body.group_url) {
      return NextResponse.json({ error: 'category_slug, group_name, and group_url required' }, { status: 400 })
    }
    // @ts-expect-error
    const { data, error } = await supabase
      .from('social_groups_catalog')
      .insert({
        category_slug: body.category_slug,
        platform: body.platform || 'facebook',
        group_name: body.group_name,
        group_url: body.group_url,
        members_count: body.members_count || null,
        posting_rules: body.posting_rules || null,
        notes: body.notes || null,
        is_active: body.is_active !== false,
        added_by: body.added_by || 'admin',
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, group: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
