// src/app/api/agents/scheduler/route.ts
// Master scheduler — runs once daily, picks all due agents, runs them sequentially.
// Hobby plan limit: 1 cron/day max.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { dispatchAgent } from '@/lib/agent-runners'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_AGENTS_PER_RUN = 17

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
  let body: { agent?: string; max?: number } = {}
  try { body = await request.json() } catch {}

  if (body.agent) {
    const r = await dispatchAgent(body.agent)
    return NextResponse.json({ single: true, result: r })
  }
  return run(body.max)
}

async function run(max?: number): Promise<NextResponse> {
  const limit = Math.min(max ?? MAX_AGENTS_PER_RUN, MAX_AGENTS_PER_RUN)

  const { data: dueAgents, error } = await supabaseAdmin.rpc('pick_due_agents', {
    p_max: limit,
  })

  if (error) {
    return NextResponse.json({ error: 'pick_due_agents failed', detail: error.message }, { status: 500 })
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
    dispatched: due.length,
    results,
  })
}
