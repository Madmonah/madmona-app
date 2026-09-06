// src/app/api/site-settings/route.ts
// ============================================================================
// ⚙️ قراءة عامة لمفاتيح محددة من site_settings (٦ سبتمبر ٢٠٢٦)
//    الجدول مقفول على anon (إغلاق ٢٨/٨) — فالصفحات العامة بتقرا من هنا
//    **مفاتيح في قايمة بيضا بس**. أول استخدام: مدة عرض السيستم (erp_offer_period)
//    على /pro — محمد بيحددها، والصفحة مابتنطقش بمدة لو مش متحددة.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = new Set(['erp_offer_period', 'erp_offer_note'])

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || ''
  if (!PUBLIC_KEYS.has(key)) return NextResponse.json({ ok: false, error: 'key' }, { status: 400 })
  const { data } = await admin.from('site_settings').select('value').eq('key', key).maybeSingle()
  return NextResponse.json({ ok: true, key, value: (data as { value?: string } | null)?.value ?? null }, {
    headers: { 'cache-control': 'public, max-age=300' },
  })
}
