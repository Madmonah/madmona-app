// src/app/api/admin/prompt-version-action/route.ts
// Activate or reject a prompt version proposed by Prompt Optimizer

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const adminPw = request.headers.get('x-admin-pw')
  if (!adminPw || adminPw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { version_id?: string; action?: 'activate' | 'reject' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.version_id || !body.action) {
    return NextResponse.json({ error: 'version_id and action required' }, { status: 400 })
  }

  // Get the version
  const { data: version } = await supabaseAdmin
    .from('prompt_versions')
    .select('agent_name, version')
    .eq('id', body.version_id)
    .maybeSingle()

  if (!version) {
    return NextResponse.json({ error: 'version not found' }, { status: 404 })
  }

  type V = { agent_name: string; version: number }
  const v = version as V

  if (body.action === 'activate') {
    // Deactivate all other versions for this agent
    await supabaseAdmin
      .from('prompt_versions')
      .update({ is_active: false } as never)
      .eq('agent_name', v.agent_name)

    // Activate this version
    await supabaseAdmin
      .from('prompt_versions')
      .update({ is_active: true } as never)
      .eq('id', body.version_id)

    // Record feedback signal — Mohamed approved this prompt change
    await supabaseAdmin.from('feedback_signals').insert({
      agent_name: 'prompt-optimizer',
      output_table: 'prompt_versions',
      output_id: body.version_id,
      signal_type: 'approved',
      signal_value: `activated v${v.version} for ${v.agent_name}`,
    } as never)
  } else {
    // Mark version as rejected (set is_active false, add reject flag in metadata)
    await supabaseAdmin
      .from('prompt_versions')
      .update({ is_active: false } as never)
      .eq('id', body.version_id)

    await supabaseAdmin.from('feedback_signals').insert({
      agent_name: 'prompt-optimizer',
      output_table: 'prompt_versions',
      output_id: body.version_id,
      signal_type: 'dismissed',
      signal_value: `rejected v${v.version} for ${v.agent_name}`,
    } as never)
  }

  return NextResponse.json({
    success: true,
    version_id: body.version_id,
    action: body.action,
    agent: v.agent_name,
    version: v.version,
  })
}
