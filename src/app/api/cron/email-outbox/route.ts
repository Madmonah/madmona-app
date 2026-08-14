// src/app/api/cron/email-outbox/route.ts
// ============================================================================
// 📮 تصريف طابور الإيميل — كل ١٠ دقايق
//
// ليه الملف ده موجود (١٤ أغسطس ٢٠٢٦):
//   كل القطع كانت موجودة ومشتغلة: الترايجر `tr_booking_created_emails` بيحط
//   الرسايل في `customer_email_outbox`، والـRPC `process_email_outbox`
//   بيبعتها عن طريق Resend، وصفحة `/admin/email-queue` فيها زرار بيشغّله.
//   **الناقص كان الجدولة بس.** مفيش ولا كرون في vercel.json بيلمس الطابور،
//   فالرسايل كانت بتفضل واقفة لحد ما حد يدوس الزرار بإيده.
//
//   الدليل: يوم ٨ أغسطس اتبعتت ١٧ رسالة في نفس الدقيقة — حجوزات من ٢٨ يونيو
//   و١٥ يوليو و٤ أغسطس. يعني حد فتح الصفحة ودوس، وخلاص.
//
// 🔒 مقفول افتراضيًا. ده بيبعت رسايل لعملاء حقيقيين نيابة عن صاحب المنصة،
//    فمابيشتغلش غير لما محمد يفتحه بنفسه:
//
//      UPDATE site_settings SET value = '1' WHERE key = 'email_outbox_cron_enabled';
//      -- (لو الصف مش موجود)
//      INSERT INTO site_settings (key, value) VALUES ('email_outbox_cron_enabled', '1');
//
//    وللإيقاف: خلّي القيمة '0'.
//
// الـRPC نفسه بيحمي نفسه: دفعات صغيرة (٣ أدمن + ٣ عميل لكل نداء)، ٢٥٠ملي
// بين كل طلب (٤/ثانية تحت حد Resend)، وretry مع احترام 429.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const FLAG_KEY = 'email_outbox_cron_enabled'

async function isEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('value')
    .eq('key', FLAG_KEY)
    .maybeSingle()
  // غياب المفتاح = مقفول. الفتح لازم يكون قرار صريح.
  return (data as { value?: string } | null)?.value === '1'
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  // 🔒 fail-closed: لو CRON_SECRET مش متظبط المسار يقفل، مايفتحش
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await isEnabled())) {
    return NextResponse.json({
      ok: true,
      skipped: 'disabled',
      note: `مقفول. افتحه بـ site_settings.${FLAG_KEY} = '1'`,
    })
  }

  try {
    const rpc = supabaseAdmin.rpc as unknown as (
      fn: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>

    const { data, error } = await rpc('process_email_outbox', { p_limit: 20 })
    if (error) {
      console.error('[email-outbox] rpc error:', error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, result: data })
  } catch (err) {
    const message = (err as Error).message
    console.error('[email-outbox] fatal:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
