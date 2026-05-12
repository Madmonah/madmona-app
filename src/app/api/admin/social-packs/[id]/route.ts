// app/api/admin/social-packs/[id]/route.ts
// Full detail view of a single pack including the FB-group post queue.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params

    // @ts-expect-error
    const { data: pack, error } = await supabase
      .from('social_packs')
      .select(`
        *,
        listing:listings(id, title, slug, description, city, district,
                        category:categories(name_ar, slug),
                        photos:listing_photos(url, is_primary),
                        pricing:pricing_rules(price, period_type, currency))
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!pack) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Group posts joined with catalog details
    // @ts-expect-error
    const { data: groupPosts } = await supabase
      .from('social_pack_group_posts')
      .select(`
        *,
        group:social_groups_catalog(id, group_name, group_url, members_count, platform, posting_rules)
      `)
      .eq('pack_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      pack,
      group_posts: groupPosts ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
