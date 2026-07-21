import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// تشخيص مؤقت لمسار إشعار الشات — بيرجّع فين بالظبط بيفشل. هيتشال بعد الإصلاح.
export async function GET(req: NextRequest) {
  const phone20 = (req.nextUrl.searchParams.get('phone') || '').replace(/\D/g, '')
  const local = '0' + phone20.slice(2)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: prof, error: pe } = await admin
    .from('profiles')
    .select('id, phone')
    .in('phone', [local, phone20, '+' + phone20])
    .limit(1)
    .maybeSingle()
  const pid = (prof as { id?: string; phone?: string } | null)?.id || null
  let subs: number | null = null
  let insErr: string | null = null
  let inserted = false
  if (pid) {
    const { count } = await admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', pid)
    subs = count ?? null
    const { error } = await admin.from('notification_queue').insert({
      recipient_id: pid,
      type: 'diag',
      title: 'diag',
      body: 'diag',
      url: '/chat',
      data: {},
      sent_at: new Date().toISOString(),
    } as never)
    insErr = error?.message || null
    inserted = !error
  }
  return NextResponse.json({
    phone20, local,
    foundPid: pid,
    profPhone: (prof as { phone?: string } | null)?.phone || null,
    profErr: pe?.message || null,
    subs, inserted, insErr,
  })
}
