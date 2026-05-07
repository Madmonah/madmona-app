// src/app/api/agents/scheduler/route.ts
// Master scheduler — runs once daily, drains pending queue + runs all due agents.
// Hobby plan limit: 1 cron/day max.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { dispatchAgent } from '@/lib/agent-runners'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_AGENTS_PER_RUN = 17
const MAX_DRAIN = 5  // process up to 5 pending auto-triggered runs first

function checkAuth(request: NextRequest, useCron: boolean): boolean {
  const auth = request.headers.get('authorization')
  const expected = useCron ? process.env.CRON_SECRET : process.env.AGENT_WEBHOOK_SECRET
  if (!expected) return false
  return auth === `Bearer ${expected}`
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request, true)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request, false)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { agent?: string; max?: number; drain_only?: boolean } = {}
  try { body = await request.json() } catch {}

  if (body.agent) {
    const r = await dispatchAgent(body.agent)
    return NextResponse.json({ single: true, result: r })
  }
  if (body.drain_only) {
    const drained = await drainPending()
    return NextResponse.json({ drain_only: true, drained })
  }
  return run(body.max)
}

// Drain pending auto-triggered runs from DB triggers
async function drainPending(): Promise<Array<Record<string, unknown>>> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: pending } = await supabaseAdmin
    .from('agent_runs')
    .select('id, agent_name, input_payload')
    .eq('status', 'pending')
    .gte('started_at', oneHourAgo)
    .order('started_at', { ascending: true })
    .limit(MAX_DRAIN)

  type R = {
    id: string
    agent_name: string
    input_payload: Record<string, unknown> | null
  }
  const rows = (pending ?? []) as R[]
  const results: Array<Record<string, unknown>> = []

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

  return results
}

async function run(max?: number): Promise<NextResponse> {
  const limit = Math.min(max ?? MAX_AGENTS_PER_RUN, MAX_AGENTS_PER_RUN)

  // Drain pending queue FIRST (auto-triggered from DB)
  const drained = await drainPending()

  const { data: dueAgents, error } = await supabaseAdmin.rpc('pick_due_agents', {
    p_max: limit,
  })

  if (error) {
    return NextResponse.json({
      error: 'pick_due_agents failed',
      detail: error.message,
      drained,
    }, { status: 500 })
  }

  type A = { agent_name: string; team: string }
  const due = (dueAgents ?? []) as A[]
  const results: unknown[] = []
  for (const a of due) {
    const r = await dispatchAgent(a.agent_name)
    results.push(r)
  }

  return NextResponse.json({
    success: true,
    drained: drained.length,
    drain_results: drained,
    dispatched: due.length,
    results,
  })
}
