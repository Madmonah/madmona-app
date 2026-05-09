// src/app/api/admin/insight-action/route.ts
// Mark insight as actioned/dismissed/reviewed + record feedback signal

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { insight_id?: string; action?: 'actioned' | 'dismissed' | 'reviewed'; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.insight_id || !body.action) {
    return NextResponse.json({ error: 'insight_id and action required' }, { status: 400 })
  }

  const validActions = ['actioned', 'dismissed', 'reviewed']
  if (!validActions.includes(body.action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  // Get the insight first to know which agent created it (for feedback signal)
  const { data: insight } = await supabaseAdmin
    .from('agent_insights')
    .select('agent_name')
    .eq('id', body.insight_id)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('agent_insights')
    .update({
      status: body.action,
      metadata: {
        action_taken: body.action,
        action_note: body.note ?? null,
        actioned_at: new Date().toISOString(),
      },
    } as never)
    .eq('id', body.insight_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Record feedback signal for the agent that created this insight (Phase 5 learning loop)
  type I = { agent_name: string }
  const sourceAgent = (insight as I | null)?.agent_name
  if (sourceAgent) {
    await supabaseAdmin.from('feedback_signals').insert({
      agent_name: sourceAgent,
      output_table: 'agent_insights',
      output_id: body.insight_id,
      signal_type: body.action === 'reviewed' ? 'approved' : body.action,
      signal_value: body.note ?? null,
    } as never)
  }

  return NextResponse.json({ success: true, insight_id: body.insight_id, action: body.action })
}
