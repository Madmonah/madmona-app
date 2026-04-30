import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'suspended']

// GET /api/admin/marketplace-suppliers?status=...
// Returns marketplace_suppliers joined with profile (phone, email, name)
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  // @ts-expect-error new schema not in types
  let query = supabase
    .from('marketplace_suppliers')
    .select(`
      *,
      profile:profiles!marketplace_suppliers_profile_id_fkey(id, phone, email, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    query = query.eq('kyc_status', status)
  }

  const { data, error } = await query.limit(500)

  if (error) {
    console.error('[admin/marketplace-suppliers] fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
  return NextResponse.json({ suppliers: data ?? [] })
}

// PATCH /api/admin/marketplace-suppliers
// Body: { id, kyc_status?, kyc_rejection_reason?, commission_rate? }
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, kyc_status, kyc_rejection_reason, commission_rate } = body
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (kyc_status) {
    if (!VALID_STATUSES.includes(kyc_status)) {
      return NextResponse.json({ error: 'Invalid kyc_status' }, { status: 400 })
    }
    update.kyc_status = kyc_status
    if (kyc_status === 'approved') {
      update.kyc_reviewed_at = new Date().toISOString()
      update.kyc_rejection_reason = null
    }
    if (kyc_status === 'rejected') {
      update.kyc_reviewed_at = new Date().toISOString()
      if (typeof kyc_rejection_reason === 'string') {
        update.kyc_rejection_reason = kyc_rejection_reason.slice(0, 500)
      }
    }
  }

  if (typeof commission_rate === 'number' && commission_rate >= 0 && commission_rate <= 100) {
    update.commission_rate = commission_rate
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabase.from('marketplace_suppliers').update(update).eq('id', id)
  if (error) {
    console.error('[admin/marketplace-suppliers] update error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
