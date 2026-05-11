import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { group_name, group_url, notes } = body as {
      group_name?: string
      group_url?: string
      notes?: string
    }
    if (!group_name || group_name.trim().length === 0) {
      return NextResponse.json({ error: 'group_name required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('supplier_post_shares')
      .insert({
        content_id: id,
        group_name: group_name.trim(),
        group_url: group_url?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ share: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const share_id = searchParams.get('share_id')
    if (!share_id) {
      return NextResponse.json({ error: 'share_id required' }, { status: 400 })
    }
    const { error } = await supabase
      .from('supplier_post_shares')
      .delete()
      .eq('id', share_id)
      .eq('content_id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 }
    )
  }
}
