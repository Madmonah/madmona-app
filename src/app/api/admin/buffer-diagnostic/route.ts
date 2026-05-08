// src/app/api/admin/buffer-diagnostic/route.ts
// NEW endpoint (2026-05-08): Diagnostic for Buffer GraphQL connection
// Diagnostic endpoint to test Buffer connection + list channels.
// Visit: /api/admin/buffer-diagnostic?pw=<MADMONA_ADMIN_PW>

import { NextRequest, NextResponse } from 'next/server'
import { getBufferAccount, getBufferChannels, isBufferConfigured } from '@/lib/buffer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const pw = request.nextUrl.searchParams.get('pw')
  if (pw !== process.env.MADMONA_ADMIN_PW) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isBufferConfigured()) {
    return NextResponse.json({
      ok: false,
      error: 'BUFFER_ACCESS_TOKEN env var is missing',
    })
  }

  const accountRes = await getBufferAccount()
  if (!accountRes.ok || !accountRes.account) {
    return NextResponse.json({
      ok: false,
      stage: 'account',
      error: accountRes.error,
    })
  }

  const orgId = accountRes.account.organizations[0]?.id
  if (!orgId) {
    return NextResponse.json({
      ok: false,
      stage: 'organization',
      error: 'No organization found on this Buffer account',
      account: accountRes.account,
    })
  }

  const channelsRes = await getBufferChannels(orgId)
  if (!channelsRes.ok) {
    return NextResponse.json({
      ok: false,
      stage: 'channels',
      error: channelsRes.error,
      account: accountRes.account,
    })
  }

  return NextResponse.json({
    ok: true,
    account: {
      email: accountRes.account.email,
      name: accountRes.account.name,
    },
    organization: {
      id: orgId,
      name: accountRes.account.organizations[0]?.name,
    },
    channels: channelsRes.channels?.map(c => ({
      id: c.id,
      service: c.service,
      type: c.type,
      name: c.displayName,
      connected: !c.isDisconnected,
    })),
    env_check: {
      BUFFER_ACCESS_TOKEN: !!process.env.BUFFER_ACCESS_TOKEN,
      BUFFER_ORGANIZATION_ID: process.env.BUFFER_ORGANIZATION_ID === orgId
        ? 'set_correctly'
        : `mismatch: env=${process.env.BUFFER_ORGANIZATION_ID ?? 'missing'}, actual=${orgId}`,
      BUFFER_INSTAGRAM_CHANNEL_ID: !!process.env.BUFFER_INSTAGRAM_CHANNEL_ID,
      BUFFER_FACEBOOK_PAGE_CHANNEL_ID: !!process.env.BUFFER_FACEBOOK_PAGE_CHANNEL_ID,
      BUFFER_FACEBOOK_GROUP_CHANNEL_ID: !!process.env.BUFFER_FACEBOOK_GROUP_CHANNEL_ID,
    },
  })
}
