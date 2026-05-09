// src/app/api/agents/run-buffer-now/route.ts
// Background-execution endpoint for buffer-publisher.
// Bypasses Vercel Hobby 60s timeout by returning 200 immediately
// while work continues in the background via after() (Next.js 15.1+ built-in).
//
// Usage:
//   POST /api/agents/run-buffer-now
//   Authorization: Bearer ${AGENT_WEBHOOK_SECRET}
//
// Response (immediate):
//   { queued: true }
//
// dispatchAgent() handles its own agent_runs logging — check that table for status.

import { NextRequest, NextResponse, after } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { dispatchAgent } from '@/lib/agent-runners'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  // Schedule the agent to run AFTER the response is sent.
  // dispatchAgent handles its own logging into agent_runs.
  after(async () => {
    try {
      await dispatchAgent('buffer-publisher')
    } catch (err) {
      console.error('buffer-publisher background error:', err)
    }
  })

  return NextResponse.json({
    queued: true,
    message: 'buffer-publisher dispatched in background. Check agent_runs table for status.',
  })
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('agent_runs')
    .select('id, status, started_at, finished_at, duration_ms, output_summary, error_message')
    .eq('agent_name', 'buffer-publisher')
    .order('started_at', { ascending: false })
    .limit(3)

  return NextResponse.json({
    last_runs: data ?? [],
  })
}
