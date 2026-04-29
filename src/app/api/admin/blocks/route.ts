import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Reuses the same X-Admin-Password pattern as other admin routes.
function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/blocks?from=YYYY-MM-DD
// Returns all blocks from that date forward, oldest first.
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || new Date().toISOString().split('T')[0]

  // @ts-expect-error
  const { data, error } = await supabase
    .from('space_blocks')
    .select('*')
    .gte('block_date', from)
    .order('block_date', { ascending: true })
    .order('start_hour', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[admin/blocks] fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 })
  }
  return NextResponse.json({ blocks: data ?? [] })
}

// POST /api/admin/blocks
// Body: { space_slug, block_date, start_hour, end_hour, reason? }
export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { space_slug, block_date, start_hour, end_hour, reason } = body as Record<string, unknown>

  if (typeof space_slug !== 'string' || space_slug.length === 0) {
    return NextResponse.json({ error: 'space_slug required' }, { status: 400 })
  }
  if (typeof block_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(block_date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  if (
    typeof start_hour !== 'number' ||
    typeof end_hour !== 'number' ||
    !Number.isInteger(start_hour) ||
    !Number.isInteger(end_hour) ||
    start_hour < 0 ||
    end_hour <= start_hour ||
    end_hour > 24
  ) {
    return NextResponse.json({ error: 'Invalid hours' }, { status: 400 })
  }
  const reasonClean =
    typeof reason === 'string' && reason.length <= 500 ? reason.trim() || null : null

  // @ts-expect-error
  const { data, error } = await supabase
    .from('space_blocks')
    .insert({
      space_slug,
      block_date,
      start_hour,
      end_hour,
      reason: reasonClean,
      created_by: 'admin',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/blocks] insert error:', error)
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    block_id: (data as { id: string } | null)?.id ?? null,
  })
}

// DELETE /api/admin/blocks?id=UUID
export async function DELETE(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('space_blocks').delete().eq('id', id)

  if (error) {
    console.error('[admin/blocks] delete error:', error)
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
