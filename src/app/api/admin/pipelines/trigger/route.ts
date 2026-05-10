// src/app/api/admin/pipelines/trigger/route.ts
// Manually trigger a pipeline by name

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const AGENT_SECRET = process.env.AGENT_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { pipeline_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.pipeline_name) {
    return NextResponse.json({ error: 'pipeline_name required' }, { status: 400 })
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/pipeline-runner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_SECRET}`,
      },
      body: JSON.stringify({
        pipeline_name: body.pipeline_name,
        triggered_by: 'admin-manual',
      }),
      signal: AbortSignal.timeout(290_000),
    })

    const data = await r.json()
    return NextResponse.json(data, { status: r.status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
