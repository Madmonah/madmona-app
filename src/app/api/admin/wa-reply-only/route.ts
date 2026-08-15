// src/app/api/admin/wa-reply-only/route.ts
// ============================================================================
// 🚨 حارس «رد بس» — قراءة وتعديل من الشاشة.
//
// (١٥ أغسطس ٢٠٢٦ — محمد: «شيل الحارس وشغّل الباقي»)
// الحارس كان `MARID_REPLY_ONLY` على Vercel، فتغييره كان محتاج نشر كامل.
// دلوقتي بيتقفل ويتفتح من هنا — وأهم حاجة إن وضع `campaigns` بيخلّيك
// تفتحه لحملة واحدة بالاسم بدل ما تفتح الباب لكل مسارات الإرسال.
//
// بيرجّع كمان أسماء الحملات اللي لسه في الطابور، عشان الشاشة تعرضها
// كاختيارات جاهزة بدل ما تكتب الاسم بإيدك وتغلط في حرف.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'
import { getReplyOnly, saveReplyOnly } from '@/lib/wa-reply-only'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** أسماء الحملات اللي لسه ليها رسايل في الطابور. */
async function queuedCampaigns(): Promise<Array<{ name: string; queued: number }>> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .select('template_vars')
      .eq('status', 'queued')
      .limit(2000)

    const counts = new Map<string, number>()
    for (const r of ((data ?? []) as Array<{ template_vars: { campaign_name?: string } | null }>)) {
      const n = (r.template_vars?.campaign_name ?? '').trim()
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, queued]) => ({ name, queued }))
      .sort((a, b) => b.queued - a.queued)
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [cfg, campaigns] = await Promise.all([getReplyOnly(), queuedCampaigns()])
    return NextResponse.json({ ...cfg, queued_campaigns: campaigns })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { mode?: string; campaigns?: string[] | string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'JSON غير صالح' }, { status: 400 })
  }

  try {
    const saved = await saveReplyOnly(body)
    const campaigns = await queuedCampaigns()
    return NextResponse.json({ ok: true, ...saved, queued_campaigns: campaigns })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}
