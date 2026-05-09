// agent-toggle - uses Bearer token (no MADMONA_ADMIN_PW needed)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

async function verifyAdmin(authHeader: string | null) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.replace('Bearer ', '')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return null
    // @ts-expect-error
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if ((profile as { role?: string } | null)?.role !== 'admin') return null
    return user
}

export async function POST(request: NextRequest) {
    const user = await verifyAdmin(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { agent_name?: string; enabled?: boolean }
    try { body = await request.json() } catch {
          return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

  if (!body.agent_name || typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'agent_name and enabled required' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabaseAdmin.from('agent_registry').update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq('agent_name', body.agent_name)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, agent: body.agent_name, enabled: body.enabled })
}

export async function PUT(request: NextRequest) {
    const user = await verifyAdmin(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { agent_name?: string }
    try { body = await request.json() } catch {
          return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

  if (!body.agent_name) {
        return NextResponse.json({ error: 'agent_name required' }, { status: 400 })
  }

  // @ts-expect-error
  const { error } = await supabaseAdmin.from('agent_runs').insert({
        agent_name: body.agent_name,
        trigger_type: 'manual_admin',
        status: 'pending',
        started_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, queued: true, agent: body.agent_name, note: 'تم وضعه في الطابور' })
}
