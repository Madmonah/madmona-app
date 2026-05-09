import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/push/unsubscribe
// Remove a subscription by endpoint
// Body: { endpoint: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const endpoint = body?.endpoint
    if (!endpoint) {
      return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // @ts-expect-error
    const { error } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
