// app/api/admin/social-packs/route.ts
// List all social packs (with optional status filter) and their listing + groups context.
// Also exposes POST to trigger the builder for a specific pack_id.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status') // 'pending' | 'generating' | 'ready' | 'error' | null (all)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500)

    // @ts-expect-error generated types not in sync with new tables
    let query = supabase
      .from('social_packs')
      .select(`
        id, status, created_at, updated_at, completed_at, error_message, retry_count,
        reel_script, post_copies, hashtags, design_brief,
        square_canva_url, story_canva_url, carousel_canva_url,
        published_to_ig_at, published_to_fb_page_at,
        listing:listings(id, title, slug, city, status,
                         category:categories(name_ar, slug, parent_id))
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusFilter) query = query.eq('status', statusFilter)

    const { data: packs, error } = await query
    if (error) throw error

    // Aggregate stats
    // @ts-expect-error
    const { data: statsRaw } = await supabase
      .from('social_packs')
      .select('status')
    const counts: Record<string, number> = {}
    for (const r of (statsRaw ?? []) as { status: string }[]) {
      counts[r.status] = (counts[r.status] ?? 0) + 1
    }

    return NextResponse.json({
      packs: packs ?? [],
      counts,
      total: (packs ?? []).length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Trigger the builder for a specific pack (admin "regenerate" button)
  try {
    const body = await req.json().catch(() => ({}))
    const packId: string | undefined = body.pack_id

    if (packId) {
      // Reset to pending first so the builder can claim it
      // @ts-expect-error
      await supabase
        .from('social_packs')
        .update({ status: 'pending', error_message: null, updated_at: new Date().toISOString() })
        .eq('id', packId)
    }

    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-pack-builder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packId ? { pack_id: packId } : { limit: 5 }),
      }
    )
    const data = await r.json()
    return NextResponse.json(data, { status: r.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
