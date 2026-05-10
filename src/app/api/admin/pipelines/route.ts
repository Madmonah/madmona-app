// src/app/api/admin/pipelines/route.ts
// List all pipelines with their last run summary

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: pipelines, error } = await supabaseAdmin
    .from('agent_pipelines')
    .select('id, name, description, steps, schedule_cron, enabled, created_at')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type P = { id: string; name: string; description: string; steps: unknown; schedule_cron: string; enabled: boolean; created_at: string }
  const list = (pipelines ?? []) as P[]

  const enriched = await Promise.all(
    list.map(async (p) => {
      const { data: lastRun } = await supabaseAdmin
        .from('pipeline_runs')
        .select('id, status, started_at, completed_at, total_steps, current_step, error, triggered_by')
        .eq('pipeline_id', p.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: totalRuns } = await supabaseAdmin
        .from('pipeline_runs')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_id', p.id)

      const { count: successRuns } = await supabaseAdmin
        .from('pipeline_runs')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_id', p.id)
        .eq('status', 'completed')

      return {
        ...p,
        last_run: lastRun ?? null,
        total_runs: totalRuns ?? 0,
        success_runs: successRuns ?? 0,
      }
    })
  )

  const { data: recentRuns } = await supabaseAdmin
    .from('pipeline_runs')
    .select('id, pipeline_name, status, started_at, completed_at, total_steps, current_step, triggered_by')
    .order('started_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    pipelines: enriched,
    recent_runs: recentRuns ?? [],
  })
}
