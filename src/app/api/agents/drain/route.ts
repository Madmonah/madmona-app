// src/app/api/agents/drain/route.ts
// Drains pending auto-triggered agent runs (from DB triggers).
// Called by external poll OR manually from /admin/ai-os.
//
// IMPORTANT: Processes ONE agent per call to avoid Vercel Hobby plan
// 60s function timeout. Multiple agents queued up will be drained
// across consecutive cron calls (every 2 min).

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

  // Parse optional body for "limit" override (default: 1)
  let limit = 1
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.limit === 'number' && body.limit > 0 && body.limit <= 5) {
      limit = body.limit
    }
  } catch {
    // ignore body parse errors
  }

  // Get pending auto-triggered runs (oldest first)
  const { data: pending } = await supabaseAdmin
    .from('agent_runs')
    .select('id, agent_name, input_payload, started_at')
    .eq('status', 'pending')
    .order('started_at', { ascending: true })
    .limit(limit)

  type R = {
    id: string
    agent_name: string
    input_payload: Record<string, unknown> | null
    started_at: string
  }
  const rows = (pending ?? []) as R[]

  if (rows.length === 0) {
    return NextResponse.json({ drained: 0, results: [] })
  }

  const results: Array<{
    agent: string
    success: boolean
    duration_ms: number
    error?: string
    output_summary?: Record<string, unknown>
  }> = []

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
      output_summary: result.output_summary,
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
