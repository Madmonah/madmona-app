import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/suppliers?status=pending|approved|rejected|all
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  // @ts-expect-error
  let query = supabase.from('suppliers').select('*').order('created_at', { ascending: false })
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  const { data, error } = await query.limit(500)

  if (error) {
    console.error('[admin/suppliers] fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ suppliers: data ?? [] })
}

// PATCH /api/admin/suppliers
// Body: { id, status, rejection_reason?, commission_rate? }
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, status, rejection_reason, commission_rate } = body as Record<string, unknown>
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof status === 'string' && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    update.status = status
    if (status === 'approved') update.approved_at = new Date().toISOString()
    if (status === 'rejected' && typeof rejection_reason === 'string') {
      update.rejection_reason = rejection_reason.slice(0, 500)
    }
  }
  if (typeof commission_rate === 'number' && commission_rate >= 0 && commission_rate <= 100) {
    update.commission_rate = commission_rate
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('suppliers').update(update).eq('id', id)
  if (error) {
    console.error('[admin/suppliers] update error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
