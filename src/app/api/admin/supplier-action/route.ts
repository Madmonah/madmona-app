// supplier-action route - uses Bearer token (no @supabase/ssr)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

async function getUserFromAuthHeader(authHeader: string | null) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.replace('Bearer ', '')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await sb.auth.getUser(token)
    return user
}

export async function POST(request: NextRequest) {
    const user = await getUserFromAuthHeader(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // @ts-expect-error
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if ((profile as { role?: string } | null)?.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    let body: { supplier_id?: string; action?: 'approve' | 'reject' | 'suspend'; reason?: string }
    try { body = await request.json() } catch {
          return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    if (!body.supplier_id || !body.action) {
          return NextResponse.json({ error: 'supplier_id and action required' }, { status: 400 })
    }
    const newStatus = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : body.action === 'suspend' ? 'suspended' : null
    if (!newStatus) return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    const updateData: Record<string, unknown> = {
          kyc_status: newStatus,
          kyc_reviewed_by: user.id,
          kyc_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
    }
    if (body.action === 'reject' && body.reason) updateData.kyc_rejection_reason = body.reason
    // @ts-expect-error
  const { data, error } = await supabaseAdmin.from('marketplace_suppliers').update(updateData).eq('id', body.supplier_id).select('id, business_name, kyc_status').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, supplier: data, action: body.action })
}
