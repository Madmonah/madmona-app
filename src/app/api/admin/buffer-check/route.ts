// src/app/api/admin/buffer-check/route.ts
// Buffer health diagnostic — verifies Vercel env vars and Buffer API connectivity.
// Returns a checklist of what's missing/working.
//
// Usage: GET /api/admin/buffer-check
// Auth:  Bearer ${AGENT_WEBHOOK_SECRET} or admin session

import { NextRequest, NextResponse } from 'next/server'
import { getBufferAccount, getBufferChannels, isBufferConfigured } from '@/lib/buffer'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckResult = {
  name: string
  status: 'ok' | 'missing' | 'error'
  detail?: string
}

async function isAdmin(request: NextRequest): Promise<boolean> {
  // Allow webhook secret
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${process.env.AGENT_WEBHOOK_SECRET}`) return true

  // Otherwise check admin session
  const accessToken = request.cookies.get('sb-access-token')?.value
  if (!accessToken) return false
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  if (!user) return false
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: CheckResult[] = []

  // 1. Env vars
  const envVars = [
    'BUFFER_ACCESS_TOKEN',
    'BUFFER_ORGANIZATION_ID',
    'BUFFER_INSTAGRAM_CHANNEL_ID',
    'BUFFER_FACEBOOK_PAGE_CHANNEL_ID',
    'BUFFER_FACEBOOK_GROUP_CHANNEL_ID',
  ]
  for (const v of envVars) {
    const val = process.env[v]
    checks.push({
      name: `env: ${v}`,
      status: val ? 'ok' : 'missing',
      detail: val ? `${val.slice(0, 6)}...${val.slice(-4)} (${val.length} chars)` : 'مش موجود في Vercel env vars',
    })
  }

  // 2. Buffer API auth check
  if (isBufferConfigured()) {
    const account = await getBufferAccount()
    if (account.ok && account.account) {
      checks.push({
        name: 'Buffer account auth',
        status: 'ok',
        detail: `${account.account.email} · ${account.account.organizations.length} org(s)`,
      })

      // 3. Channels check
      const orgId = process.env.BUFFER_ORGANIZATION_ID || account.account.organizations[0]?.id
      if (orgId) {
        const channels = await getBufferChannels(orgId)
        if (channels.ok && channels.channels) {
          const connected = channels.channels.filter(c => !c.isDisconnected)
          checks.push({
            name: 'Buffer channels',
            status: 'ok',
            detail: `${connected.length} connected: ${connected.map(c => `${c.service}/${c.displayName}`).join(', ')}`,
          })

          // Verify each configured channel ID actually exists
          const channelIds = {
            instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID,
            facebook_page: process.env.BUFFER_FACEBOOK_PAGE_CHANNEL_ID,
            facebook_group: process.env.BUFFER_FACEBOOK_GROUP_CHANNEL_ID,
          }
          for (const [label, id] of Object.entries(channelIds)) {
            if (!id) continue
            const found = channels.channels.find(c => c.id === id)
            checks.push({
              name: `channel match: ${label}`,
              status: found ? (found.isDisconnected ? 'error' : 'ok') : 'error',
              detail: found
                ? (found.isDisconnected ? `قناة "${found.displayName}" مفصولة` : `→ ${found.service}/${found.displayName}`)
                : `الـ channel ID "${id}" مش موجود في الـ Buffer account`,
            })
          }
        } else {
          checks.push({ name: 'Buffer channels', status: 'error', detail: channels.error })
        }
      }
    } else {
      checks.push({ name: 'Buffer account auth', status: 'error', detail: account.error })
    }
  } else {
    checks.push({
      name: 'Buffer auth',
      status: 'missing',
      detail: 'لا يمكن الاختبار — BUFFER_ACCESS_TOKEN ناقص',
    })
  }

  // 4. DB state
  const { data: stats } = await supabaseAdmin
    .from('content_calendar')
    .select('status', { count: 'exact' })

  const summary = {
    approved_ready: (stats ?? []).filter(s => (s as { status: string }).status === 'approved').length,
    drafted: (stats ?? []).filter(s => (s as { status: string }).status === 'drafted').length,
    sent_to_make: (stats ?? []).filter(s => (s as { status: string }).status === 'sent_to_make').length,
  }

  return NextResponse.json({
    overall: checks.every(c => c.status === 'ok') ? 'healthy' : 'issues_found',
    checks,
    db_queue: summary,
    checked_at: new Date().toISOString(),
  })
}
