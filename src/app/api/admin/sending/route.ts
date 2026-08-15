// src/app/api/admin/sending/route.ts
// ============================================================================
// 📡 «مين بيبعت إيه» — نداء واحد بيجمع حاجتين:
//    ① تاريخ من الداتابيز (RPC sending_overview): إيه اتبعت ووصل ولا لأ.
//    ② **حالة الأجهزة الحية من OpenWA** — مين متصل دلوقتي فعلًا.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «عايز لينك بين الأجهزة المتوصلة بأوبن واتساب
//    والشاشات بتاعتنا») من غير ② الشاشة بتوريك الماضي بس. اختبار الإرسال
//    امبارح فشل بـ «Session is not connected» — ومفيش شاشة كانت بتقول ده
//    قبل ما نجرب. دلوقتي بيبان قبل ما تبعت.
//
// ⚠️ /admin/wa-numbers بيقرا من WA_SERVICE_URL — ده جسر Baileys **اللي
//    اتشال**. عشان كده بيعرض أرقام مش موجودة. الصفحة دي بتقرا من OpenWA
//    اللي بيبعت فعلًا.
//
// 🔒 الحارس بقى `isAdminRequest` من `@/lib/adminGate` — بيقبل كوكي جلسة
//    الأدمن زي الـmiddleware. قبل كده كان بيقارن بـ`ADMIN_PASSWORD` القديم
//    اللي اتشال في مراجعة ١٢ أغسطس، فكان بيرجّع 401 دايمًا والصفحة ماكانتش تفتح.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// نداء OpenWA لوحده ممكن ياخد ٨ ثواني — الحد الافتراضي ١٠ ثواني كان ممكن
// يقطع الطلب ويرجّع ٥٠٠ فاضي من غير أي رسالة.
export const maxDuration = 30


interface OpenWaSession {
  id?: string
  name?: string
  phone?: string | number
  status?: string
}

interface Device {
  id: string
  name: string
  phone: string | null
  status: string
  connected: boolean
  used_by: string[]
}

// أنهي مُرسِل بيستخدم أنهي جلسة — من نفس متغيرات البيئة اللي الكرونات بتقراها
function senderMap(): Array<{ name: string; session: string; source: string }> {
  const campaign = process.env.WA_CAMPAIGN_SESSION || 'madmona-982'
  return [
    { name: 'طابور الواتساب',        session: campaign, source: 'WA_CAMPAIGN_SESSION' },
    { name: 'إشعارات الحجز',          session: campaign, source: 'WA_CAMPAIGN_SESSION' },
    { name: 'الإرسال المتدرّج',        session: '(من whatsapp_config.paced_send_sessions)', source: 'whatsapp_config' },
  ]
}

async function fetchDevices(senders: ReturnType<typeof senderMap>) {
  const base = (process.env.OPENWA_URL || '').replace(/\/$/, '')
  const key = process.env.OPENWA_API_KEY || ''
  if (!base || !key) {
    return { reachable: false, error: 'OPENWA_URL أو OPENWA_API_KEY ناقص', devices: [] as Device[] }
  }
  try {
    const r = await fetch(`${base}/api/sessions`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!r.ok) {
      return { reachable: false, error: `OpenWA رد ${r.status}`, devices: [] as Device[] }
    }
    const list = (await r.json()) as OpenWaSession[]
    const devices: Device[] = (Array.isArray(list) ? list : []).map((s) => {
      const name = String(s.name ?? s.id ?? '—')
      const phone = s.phone != null ? String(s.phone).replace(/\D/g, '') : null
      // المُرسِل ممكن يشاور على الجلسة باسمها أو برقمها — الاتنين بيتطابقوا
      const used = senders
        .filter((x) => x.session === name || (phone && x.session === phone))
        .map((x) => x.name)
      return {
        id: String(s.id ?? name),
        name,
        phone,
        status: String(s.status ?? 'unknown'),
        connected: s.status === 'ready',
        used_by: used,
      }
    })
    return { reachable: true, error: null as string | null, devices }
  } catch (e) {
    return { reachable: false, error: (e as Error).message, devices: [] as Device[] }
  }
}

// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «الراوت رجّع 500 مش JSON — (رد فاضي)»)
//    أي استثناء مش متمسوك هنا بيخلّي Vercel يرجّع ٥٠٠ **بجسم فاضي**، فمفيش
//    ولا معلومة تقول إيه اللي وقع. الغلاف ده بيمسك أي حاجة ويرجّعها JSON
//    فيها اسم الخطأ ورسالته — الشاشة بتعرضها زي ما هي.
export async function GET(request: Request) {
  try {
    return await handle(request)
  } catch (e) {
    const err = e as Error
    console.error('[admin/sending] unhandled:', err)
    return NextResponse.json(
      { error: 'Unhandled', detail: `${err?.name || 'Error'}: ${err?.message || String(e)}` },
      { status: 500 },
    )
  }
}

async function handle(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rpc = supabase.rpc as unknown as (
    fn: string,
    a?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>

  const senders = senderMap()
  // الاتنين على التوازي — حالة الأجهزة مالهاش لازمة تستنى الداتابيز
  const [db, live] = await Promise.all([rpc('sending_overview'), fetchDevices(senders)])

  if (db.error) {
    console.error('[admin/sending] rpc error:', db.error.message)
    return NextResponse.json({ error: 'Failed', detail: db.error.message }, { status: 500 })
  }

  const base = (db.data ?? {}) as Record<string, unknown>

  // 🔗 اللينك: كل مُرسِل + حالة جهازه الحية. لو الجلسة مش في القايمة
  //    يبقى الجهاز مش موجود على OpenWA خالص — وده أوضح سبب للفشل.
  const senderStatus = senders.map((s) => {
    const dev = live.devices.find((x) => x.name === s.session || x.phone === s.session)
    return {
      ...s,
      device_status: dev?.status ?? (live.reachable ? 'مش موجود على OpenWA' : 'مش معروف'),
      connected: dev?.connected ?? false,
      device_phone: dev?.phone ?? null,
    }
  })

  return NextResponse.json({
    ...base,
    openwa: { reachable: live.reachable, error: live.error },
    devices: live.devices,
    senders: senderStatus,
  })
}
