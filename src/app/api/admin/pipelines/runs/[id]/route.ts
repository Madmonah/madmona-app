// src/app/api/admin/pipelines/runs/[id]/route.ts
// Get details for a specific pipeline run

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: run, error: runErr } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (runErr || !run) {
    return NextResponse.json({ error: 'run not found' }, { status: 404 })
  }

  const { data: steps } = await supabaseAdmin
    .from('pipeline_step_runs')
    .select('id, step_index, agent_name, status, started_at, completed_at, duration_ms, output, output_key, error')
    .eq('pipeline_run_id', id)
    .order('step_index')

  return NextResponse.json({
    run,
    steps: steps ?? [],
  })
}
