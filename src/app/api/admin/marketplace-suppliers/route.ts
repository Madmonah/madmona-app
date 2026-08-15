// src/app/api/admin/marketplace-suppliers/route.ts
// Marketplace suppliers admin API — uses Bearer token auth (no @supabase/ssr dependency)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'suspended']

async function verifyAdmin(authHeader: string | null): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { ok: false, reason: 'no_token' }
    }
    const token = authHeader.replace('Bearer ', '')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return { ok: false, reason: 'not_authenticated' }

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).maybeSingle()

    const role = (profile as { role?: string } | null)?.role
    if (role !== 'admin') return { ok: false, reason: 'not_admin' }

    return { ok: true, userId: user.id }
  } catch (e) {
    console.error('[admin/marketplace-suppliers] auth error:', e)
    return { ok: false, reason: 'auth_error' }
  }
}

export async function GET(request: Request) {
  // Allow legacy X-Admin-Password header for backward compat
  const legacyPw = request.headers.get('x-admin-password')
  const expectedLegacy = process.env.MADMONA_ADMIN_PW || process.env.ADMIN_PASSWORD
  const legacyOk = (expectedLegacy && legacyPw === expectedLegacy) || (await isAdminRequest(request))

  if (!legacyOk) {
    const auth = await verifyAdmin(request.headers.get('authorization'))
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  let query = supabaseAdmin
    .from('marketplace_suppliers')
    .select('*, profile:profiles!marketplace_suppliers_profile_id_fkey(id, phone, email, full_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    query = query.eq('kyc_status', status)
  }

  const { data, error } = await query.limit(500)
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch', details: error.message }, { status: 500 })
  }
  return NextResponse.json({ suppliers: data ?? [] })
}

export async function PATCH(request: Request) {
  const legacyPw = request.headers.get('x-admin-password')
  const expectedLegacy = process.env.MADMONA_ADMIN_PW || process.env.ADMIN_PASSWORD
  const legacyOk = (expectedLegacy && legacyPw === expectedLegacy) || (await isAdminRequest(request))

  let userId: string | undefined
  if (!legacyOk) {
    const auth = await verifyAdmin(request.headers.get('authorization'))
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
    }
    userId = auth.userId
  }

  let body: { id?: string; kyc_status?: string; kyc_rejection_reason?: string; commission_rate?: number }
  try {
    body = await request.json()
  } catch {
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
    if (userId) update.kyc_reviewed_by = userId
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

  update.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('marketplace_suppliers')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
