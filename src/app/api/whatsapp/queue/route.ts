// src/app/api/whatsapp/queue/route.ts
// طابور إرسال المارد — إضافة حملة للطابور بجدولة زمنية آمنة.
//
// مابيبعتش حاجة فورًا. بيحط الرسايل في whatsapp_campaign_messages
// بمواعيد متباعدة عشوائيًا، والكرون هو اللي بيبعت واحدة واحدة.
//
// 🔁 (١٥ أغسطس ٢٠٢٦) المنطق نفسه اتنقل لـ`src/lib/wa-queue.ts` عشان راوت
//    الأدمن (/api/admin/send، اللي الشاشة بتناديه بكلمة سر الأدمن) يستخدم
//    **نفس** قواعد الأمان بدل ما تتنسخ. الراوت ده اتساب زي ما هو للأنظمة
//    اللي بتنادي بسر الخدمة.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { queueCampaign, SAFETY, type Recipient } from '@/lib/wa-queue'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // حماية: نفس سر الخدمة أو سر الكرون
  const secret = request.headers.get('x-madmona-secret')
  const okSecret =
    (process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET) ||
    (process.env.CRON_SECRET && secret === process.env.CRON_SECRET)
  if (!okSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    campaign_name?: string
    recipients?: Recipient[]
    dry_run?: boolean
    skip_recent_days?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const result = await queueCampaign({
    campaign_name: body.campaign_name,
    recipients: body.recipients ?? [],
    dry_run: body.dry_run,
    skip_recent_days: body.skip_recent_days,
  })

  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === 'recipients مطلوبة' ? 400 : 500,
    })
  }
  return NextResponse.json(result)
}

// حالة الطابور
export async function GET() {
  const { data } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('status')
    .in('status', ['queued', 'sent', 'failed'])

  const counts = ((data ?? []) as Array<{ status: string }>).reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {}
  )
  return NextResponse.json({ ok: true, counts, safety: SAFETY })
}
