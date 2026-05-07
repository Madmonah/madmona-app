// src/app/api/admin/insight-action/route.ts
// Mark insight as actioned/dismissed/reviewed

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

  return NextResponse.json({ success: true, insight_id: body.insight_id, action: body.action })
}
