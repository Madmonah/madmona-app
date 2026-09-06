// src/app/api/campaign/offer/route.ts
// ============================================================================
// 💼 حالة عرض السيستم (٦ سبتمبر ٢٠٢٦) — للصفحة العامة /pro
//
// محمد: «العرض ساري لعدد حسابات — هنقول بـ١٠٠٠ ج بدل كتيييير، لا هنقول ٢٠٠٠
// ولا ٣٠٠٠». العدد والمدة **من site_settings** (erp_offer_seats · erp_offer_period)
// — لو مش متحطين الصفحة بتقول «لعدد محدود» من غير رقم. المتبقي = العدد − اللي
// اشتركوا فعلًا (campaign_leads.status='converted') — رقم حقيقي مش مخترع.
// ============================================================================
import { NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: rows } = await admin.from('site_settings').select('key, value').in('key', ['erp_offer_seats', 'erp_offer_period', 'erp_offer_note'])
  const s: Record<string, string> = {}
  for (const r of (rows as Array<{ key: string; value: string }> | null) ?? []) s[r.key] = r.value
  const seats = Number(s.erp_offer_seats) > 0 ? Number(s.erp_offer_seats) : null
  let remaining: number | null = null
  if (seats) {
    const { count } = await admin.from('campaign_leads').select('id', { count: 'exact', head: true }).eq('campaign', 'erp1000').eq('status', 'converted')
    remaining = Math.max(0, seats - (count ?? 0))
  }
  return NextResponse.json({ ok: true, price: 1000, seats, remaining, period: s.erp_offer_period || null, note: s.erp_offer_note || null },
    { headers: { 'cache-control': 'public, max-age=60' } })
}
