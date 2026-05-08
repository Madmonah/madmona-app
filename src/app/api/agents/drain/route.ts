// src/app/api/agents/drain/route.ts
// Drains pending auto-triggered agent runs (from DB triggers).
// Called by external poll OR manually from /admin/ai-os.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { dispatchAgent } from '@/lib/agent-runners'

export const runtime = 'nodejs'
export const maxDuration = 300

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  const expected = process.env.AGENT_WEBHOOK_SECRET
  if (!expected) return false
  return auth === `Bearer ${expected}`
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get pending auto-triggered runs (last 1 hour, max 10)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: pending } = await supabaseAdmin
    .from('agent_runs')
    .select('id, agent_name, input_payload, started_at')
    .eq('status', 'pending')
    .order('started_at', { ascending: true })
    .limit(50)

  type R = {
    id: string
    agent_name: string
    input_payload: Record<string, unknown> | null
    started_at: string
  }
  const rows = (pending ?? []) as R[]

  const results: Array<{ agent: string; success: boolean; duration_ms: number; error?: string }> = []

  for (const r of rows) {
    // Mark as in-progress so other workers don't pick it up
    await supabaseAdmin
      .from('agent_runs')
      .update({ status: 'started' } as never)
      .eq('id', r.id)

    const result = await dispatchAgent(r.agent_name, r.input_payload ?? undefined)
    results.push({
      agent: r.agent_name,
      success: result.success,
      duration_ms: result.duration_ms,
      error: result.error,
    })
  }

  return NextResponse.json({
    drained: rows.length,
    results,
  })
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count } = await supabaseAdmin
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({
    pending: count ?? 0,
  })
}
