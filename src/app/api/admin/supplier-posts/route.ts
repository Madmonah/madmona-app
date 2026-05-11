import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Fetch posts + their share history
    const { data: posts, error } = await supabase
      .from('content_calendar')
      .select('id, category, title, body, cta, hashtags, external_url, published_at')
      .eq('agent_name', 'supplier-acquisition')

    if (error) throw error

    // Fetch share counts per post
    const ids = (posts ?? []).map((p) => p.id)
    const { data: shares } = await supabase
      .from('supplier_post_shares')
      .select('content_id, id, group_name, group_url, shared_at, notes')
      .in('content_id', ids)
      .order('shared_at', { ascending: false })

    const sharesByPost: Record<string, typeof shares> = {}
    for (const s of shares ?? []) {
      if (!sharesByPost[s.content_id]) sharesByPost[s.content_id] = []
      sharesByPost[s.content_id].push(s)
    }

    // Order by display category
    const order = [
      'vehicles', 'properties', 'tourism', 'workspaces', 'marine',
      'equipment', 'media', 'weddings', 'recreation', 'professionals',
    ]
    const enriched = (posts ?? [])
      .map((p) => ({ ...p, shares: sharesByPost[p.id] ?? [] }))
      .sort((a, b) => {
        const ai = order.indexOf(a.category as string)
        const bi = order.indexOf(b.category as string)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

    return NextResponse.json({ posts: enriched })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 }
    )
  }
}
