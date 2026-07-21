import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMany, isPushConfigured, type PushPayload } from '@/lib/web-push'

// POST /api/push/process-queue
//
// Process unsent notifications from notification_queue table.
// Designed to be called via:
//   1. External cron (cron-job.org, GitHub Actions, etc.) with CRON_SECRET header
//   2. Supabase Database Webhook on INSERT
//   3. Admin user from /admin/notifications page (auth via Bearer JWT)
//   4. Manual trigger

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  return handle(req)
}

// Allow GET for external cron services
export async function GET(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest) {
  // Verify auth: CRON_SECRET, Vercel cron header, OR authenticated admin user (Bearer JWT)
  const auth = req.headers.get('authorization') || ''
  const provided = auth.replace(/^Bearer\s+/i, '').trim()
  const vercelCron = req.headers.get('x-vercel-cron') || req.headers.get('x-vercel-cron-signature')

  let authorized = false

  // Method 1: Vercel cron auto-auth (request originated from Vercel cron infrastructure)
  if (vercelCron) {
    authorized = true
  }

  // Method 2: CRON_SECRET match
  if (!authorized && CRON_SECRET && provided === CRON_SECRET) {
    authorized = true
  }

  // Method 2: User JWT — verify and check admin role
  if (!authorized && provided && provided !== CRON_SECRET) {
    try {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${provided}` } } }
      )
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        // @ts-expect-error
        const { data: prof } = await userClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (prof?.role === 'admin') {
          authorized = true
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'push_not_configured' }, { status: 200 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Pull next 50 unsent items
  // @ts-expect-error
  const { data: queue, error: queueErr } = await adminClient
    .from('notification_queue')
    .select('*')
    .is('sent_at', null)
    .lt('failed_count', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  if (queueErr) {
    return NextResponse.json({ error: queueErr.message }, { status: 500 })
  }

  if (!queue || queue.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  type QueueItem = {
    id: string
    recipient_id: string
    type: string
    title: string
    body: string
    url: string | null
    data: Record<string, unknown>
    failed_count: number
  }

  let totalSent = 0
  let totalFailed = 0
  const expiredEndpoints: string[] = []
  const processedIds: string[] = []
  const failedIds: string[] = []

  for (const item of queue as QueueItem[]) {
    // Get all subscriptions for this user
    // @ts-expect-error
    const { data: subs } = await adminClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('profile_id', item.recipient_id)

    type SubRow = { endpoint: string; p256dh: string; auth: string }
    const subRows = (subs || []) as SubRow[]

    if (subRows.length === 0) {
      // No subscriptions — mark as sent (no point keeping it)
      processedIds.push(item.id)
      continue
    }

    const iconFromData = item.data && typeof (item.data as Record<string, unknown>).icon === 'string'
      ? (item.data as Record<string, string>).icon
      : undefined
    const payload: PushPayload = {
      title: item.title,
      body: item.body,
      url: item.url || '/',
      tag: item.type,
      icon: iconFromData,
      data: item.data || {},
    }

    const result = await sendPushToMany(subRows, payload)
    totalSent += result.sent
    totalFailed += result.failed
    expiredEndpoints.push(...result.expiredEndpoints)

    if (result.sent > 0) {
      processedIds.push(item.id)
    } else if (result.failed > 0) {
      failedIds.push(item.id)
    }
  }

  // Mark sent
  if (processedIds.length > 0) {
    // @ts-expect-error
    await adminClient
      .from('notification_queue')
      .update({ sent_at: new Date().toISOString() })
      .in('id', processedIds)
  }

  // Increment failed_count for failed items
  if (failedIds.length > 0) {
    for (const fid of failedIds) {
      // @ts-expect-error
      const { data: row } = await adminClient
        .from('notification_queue')
        .select('failed_count')
        .eq('id', fid)
        .single()
      if (row) {
        // @ts-expect-error
        await adminClient
          .from('notification_queue')
          .update({ failed_count: ((row as { failed_count: number }).failed_count || 0) + 1 })
          .eq('id', fid)
      }
    }
  }

  // Delete expired subscriptions
  if (expiredEndpoints.length > 0) {
    // @ts-expect-error
    await adminClient
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  return NextResponse.json({
    ok: true,
    processed: queue.length,
    sent: totalSent,
    failed: totalFailed,
    expiredCleaned: expiredEndpoints.length,
  })
}
