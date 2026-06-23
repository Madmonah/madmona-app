// Pipeline Runner Edge Function
// Orchestrates sequences of agents that work as a team
// POST { pipeline_name: 'daily-content' }
// Auth: Bearer AGENT_WEBHOOK_SECRET (custom auth, no JWT)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERCEL_BASE = 'https://www.madmonacairo.com'
const AGENT_SECRET = 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'

const AGENT_EXTRAS = new Set([
  'quality-control', 'finance-tracker', 'revenue-attribution-agent',
  'pricing-optimizer', 'fraud-detector', 'demand-forecaster',
])
const AGENT_SLOW = new Set([
  'strategy-agent', 'partnership-scout', 'listing-optimizer',
])

interface AgentDispatch {
  url: string
  isSupabase: boolean
}

function getAgentRoute(agentName: string): AgentDispatch {
  if (AGENT_EXTRAS.has(agentName)) {
    return { url: `${SUPABASE_URL}/functions/v1/agent-extras`, isSupabase: true }
  }
  if (AGENT_SLOW.has(agentName)) {
    return { url: `${SUPABASE_URL}/functions/v1/agent-slow`, isSupabase: true }
  }
  return { url: `${VERCEL_BASE}/api/agents/scheduler`, isSupabase: false }
}

async function callAgent(agentName: string, args: Record<string, unknown>): Promise<{ ok: boolean; output?: unknown; error?: string }> {
  const route = getAgentRoute(agentName)
  const body = { agent: agentName, args }

  try {
    const r = await fetch(route.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })
    const data = await r.json()

    if (route.isSupabase) {
      return { ok: data.ok === true, output: data.output ?? data, error: data.error }
    } else {
      const result = data.result ?? data
      return {
        ok: result.success === true,
        output: result.output ?? result,
        error: result.error,
      }
    }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

function checkAuth(req: Request): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${AGENT_SECRET}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } })
  }
  if (req.method !== 'POST') {
    return new Response('Use POST', { status: 405 })
  }
  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  let body: { pipeline_name?: string; triggered_by?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid json' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  if (!body.pipeline_name) {
    return new Response(JSON.stringify({ ok: false, error: 'pipeline_name required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: pipeline, error: pipeErr } = await supabase
    .from('agent_pipelines')
    .select('*')
    .eq('name', body.pipeline_name)
    .eq('enabled', true)
    .maybeSingle()

  if (pipeErr || !pipeline) {
    return new Response(JSON.stringify({ ok: false, error: `pipeline "${body.pipeline_name}" not found or disabled` }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  type Step = { agent: string; output_key: string; uses_context: boolean; required: boolean; description?: string }
  const steps = pipeline.steps as Step[]

  const { data: run, error: runErr } = await supabase
    .from('pipeline_runs')
    .insert({
      pipeline_id: pipeline.id,
      pipeline_name: pipeline.name,
      status: 'running',
      total_steps: steps.length,
      current_step: 0,
      shared_context: {},
      triggered_by: body.triggered_by ?? 'api',
    })
    .select()
    .single()

  if (runErr || !run) {
    return new Response(JSON.stringify({ ok: false, error: 'failed to create pipeline_run', detail: runErr?.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const sharedContext: Record<string, unknown> = {}
  const stepResults: Array<{ agent: string; status: string; duration_ms: number; error?: string }> = []
  let pipelineFailed = false
  let pipelineError: string | null = null

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    await supabase.from('pipeline_runs').update({ current_step: i + 1 }).eq('id', run.id)

    const { data: stepRun } = await supabase
      .from('pipeline_step_runs')
      .insert({
        pipeline_run_id: run.id,
        step_index: i,
        agent_name: step.agent,
        status: 'running',
        started_at: new Date().toISOString(),
        input: step.uses_context ? sharedContext : null,
        output_key: step.output_key,
      })
      .select()
      .single()

    const start = Date.now()
    const args: Record<string, unknown> = step.uses_context ? { pipeline_context: sharedContext } : {}

    const result = await callAgent(step.agent, args)
    const duration = Date.now() - start

    if (result.ok) {
      sharedContext[step.output_key] = result.output

      await supabase.from('pipeline_step_runs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        output: result.output,
      }).eq('id', stepRun.id)

      stepResults.push({ agent: step.agent, status: 'OK', duration_ms: duration })

      await supabase.from('pipeline_runs').update({ shared_context: sharedContext }).eq('id', run.id)
    } else {
      await supabase.from('pipeline_step_runs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error: result.error ?? 'unknown',
      }).eq('id', stepRun.id)

      stepResults.push({ agent: step.agent, status: 'FAIL', duration_ms: duration, error: result.error })

      if (step.required) {
        pipelineFailed = true
        pipelineError = `Required step "${step.agent}" failed: ${result.error}`
        break
      }
    }
  }

  await supabase.from('pipeline_runs').update({
    status: pipelineFailed ? 'failed' : 'completed',
    completed_at: new Date().toISOString(),
    error: pipelineError,
  }).eq('id', run.id)

  return new Response(JSON.stringify({
    ok: !pipelineFailed,
    pipeline_run_id: run.id,
    pipeline_name: body.pipeline_name,
    steps: stepResults,
    error: pipelineError,
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
