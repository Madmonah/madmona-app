// src/app/api/admin/agent-toggle/route.ts
// Toggle an agent enabled/disabled

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Simple admin protection: require admin password
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { agent_name?: string; enabled?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.agent_name || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'agent_name and enabled required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('agent_registry')
    .update({ enabled: body.enabled, updated_at: new Date().toISOString() } as never)
    .eq('agent_name', body.agent_name)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, agent: body.agent_name, enabled: body.enabled })
}

// Trigger an agent manually
export async function PUT(request: NextRequest) {
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { agent_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.agent_name) {
    return NextResponse.json({ error: 'agent_name required' }, { status: 400 })
  }

  // Trigger via internal scheduler call
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 500 })
  }

  // Fire-and-forget: queue it as pending (drain will pick up)
  const { error } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_name: body.agent_name,
      trigger_type: 'manual_admin',
      status: 'pending',
      started_at: new Date().toISOString(),
    } as never)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    queued: true,
    agent: body.agent_name,
    note: 'تم وضعه في الطابور. هيشتغل في الـ drain القادم.',
  })
}
