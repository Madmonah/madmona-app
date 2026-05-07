// src/app/api/admin/supplier-action/route.ts
// Approve/Reject/Suspend a supplier — uses session auth (admin role)

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Verify the caller is an authenticated admin
  const cookieStore = await cookies()
  const supabaseSsr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component fallback
          }
        },
      },
    }
  )

  const { data: { user } } = await supabaseSsr.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role
  const { data: profile } = await supabaseSsr
    .from('profiles').select('role').eq('id', user.id).maybeSingle()

  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Parse body
  let body: { supplier_id?: string; action?: 'approve' | 'reject' | 'suspend'; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.supplier_id || !body.action) {
    return NextResponse.json({ error: 'supplier_id and action required' }, { status: 400 })
  }

  // Map action to status
  const newStatus =
    body.action === 'approve' ? 'approved' :
    body.action === 'reject' ? 'rejected' :
    body.action === 'suspend' ? 'suspended' : null

  if (!newStatus) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    kyc_status: newStatus,
    kyc_reviewed_by: user.id,
    kyc_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (body.action === 'reject' && body.reason) {
    updateData.kyc_rejection_reason = body.reason
  }

  const { data, error } = await supabaseAdmin
    .from('marketplace_suppliers')
    .update(updateData as never)
    .eq('id', body.supplier_id)
    .select('id, business_name, kyc_status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    supplier: data,
    action: body.action,
  })
}
