// src/app/api/campaign/lead/route.ts
// ============================================================================
// 📣 استقبال ليد من صفحات الحملات (٦ سبتمبر ٢٠٢٦)
//
// محمد: «عايز أستهدف أصحاب البيزنس إنهم يشتركوا بـ١٠٠٠ ج بدل ٢٠٠٠ — أورجانيك بالكامل».
// الفورم على /pro (وأي صفحة حملة جاية) بيبعت هنا → campaign_leads بمصدره (UTM)
// → پوش داخلي لفريق الإعلانات (نوتيفيكيشن مش واتساب — قاعدة ثابتة).
// نفس الرقم في نفس الحملة = تحديث مش تكرار. الرقم بقاعدة ٤/٩: مصر 01… وإلا دولي كامل.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
function normPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (/^01\d{9}$/.test(d)) return '20' + d.slice(1)
  if (/^1\d{9}$/.test(d)) return '20' + d
  if (/^20\d{10}$/.test(d)) return d
  if (/^\d{10,15}$/.test(d)) return d.replace(/^00/, '')
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const campaign = clean(body.campaign, 40) || 'erp1000'
  const name = clean(body.name, 120)
  const phone = normPhone(clean(body.phone, 40))
  const business_type = clean(body.business_type, 80)
  const city = clean(body.city, 80)
  const message = clean(body.message, 800)
  if (!phone) return NextResponse.json({ ok: false, error: 'اكتب رقم موبايل صح (01… أو دولي بكود الدولة)' }, { status: 400 })

  const { data: row, error } = await admin
    .from('campaign_leads')
    .upsert({
      campaign, name: name || null, phone, business_type: business_type || null, city: city || null, message: message || null,
      utm_source: clean(body.utm_source, 60) || null, utm_medium: clean(body.utm_medium, 60) || null,
      utm_content: clean(body.utm_content, 80) || null, referer: clean(req.headers.get('referer'), 300) || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'campaign,phone' })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[campaign/lead]', error.message)
    return NextResponse.json({ ok: false, error: 'مش قادرين نسجّل دلوقتي — كلّمنا واتساب' }, { status: 500 })
  }

  // 🔔 پوش داخلي للفريق — العنوان فيه الاسم/الرقم عشان ديدوب الساعة مايبلعوش
  try {
    const { data: staff } = await admin.rpc('listings_staff_profile_ids', {})
    const ids = Array.isArray(staff) ? (staff as string[]) : []
    if (ids.length) {
      await admin.from('notification_queue').insert(ids.map((rid) => ({
        recipient_id: rid, type: 'campaign_lead',
        title: `📣 ليد حملة ${campaign}: ${name || '…' + phone.slice(-4)}`,
        body: `${business_type || 'بيزنس'}${city ? ' · ' + city : ''} · ${phone}${message ? ' · ' + message.slice(0, 80) : ''}`,
        url: '/admin/dashboard#campaigns',
        data: { lead_id: row?.id, campaign, phone },
      })))
    }
  } catch (e) { console.error('[campaign/lead] notify', e instanceof Error ? e.message : e) }

  return NextResponse.json({ ok: true, id: row?.id })
}
